import type { UTCTimestamp } from "lightweight-charts";
import { buildCandles, type TradeRow } from "@/lib/candles";
import { SOL_MINT, watchSolanaMarket } from "@/lib/solana/market-ticks";

/** D'où viennent les bougies d'un graphique (données sérialisables, passées par les pages). */
export type ChartSource =
  | { kind: "hyperliquid"; coin: string }
  | {
      kind: "gecko";
      network: string;
      pool: string;
      /** blockchain DexScreener et adresse du token, pour le prix en direct */
      chain?: string;
      token?: string;
      /** DEX du pool (dexId DexScreener) et monnaie de paiement : choisissent la méthode d'écoute en direct sur Solana */
      dex?: string;
      quote?: string;
    }
  | { kind: "binance"; symbol: string }
  | { kind: "coingecko"; id: string }
  | { kind: "local"; trades: TradeRow[]; createdAt?: string };

export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type Bar = { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number };

export const LABELS: Record<Interval, string> = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1j" };
const SECONDS: Record<Interval, number> = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };

/** Durée de bougie adaptée à l'âge d'un token : à la minute pour un token qui vient de naître. */
export function intervalForAge(createdAt: number | string | null | undefined): Interval | undefined {
  const t = typeof createdAt === "string" ? Date.parse(createdAt) : createdAt;
  if (!t || !Number.isFinite(t)) return undefined;
  const hours = (Date.now() - t) / 3_600_000;
  return hours < 6 ? "1m" : hours < 72 ? "5m" : "15m";
}

/** Durées proposées selon la source, et la durée par défaut. */
export function intervalsOf(s: ChartSource): Interval[] {
  if (s.kind === "coingecko") return ["15m", "4h", "1d"];
  return ["1m", "5m", "15m", "1h", "4h", "1d"];
}

/** Fréquence d'actualisation quand il n'y a pas de flux en direct (ms). */
export function pollMs(s: ChartSource): number | null {
  // L'historique des memecoins est rechargé de temps en temps ; entre-temps, le direct fait vivre les bougies
  if (s.kind === "gecko") return 45_000;
  if (s.kind === "coingecko") return 120_000;
  return null;
}

/** Réseaux GeckoTerminal (identifiants DexScreener → GeckoTerminal). */
const GECKO_NET: Record<string, string> = { solana: "solana", base: "base", bsc: "bsc", ethereum: "eth", robinhood: "robinhood" };
export const geckoNetwork = (chain: string) => GECKO_NET[chain] ?? chain;

/** D'abord notre relais (cache partagé), sinon directement le service. Lève une erreur si les deux échouent. */
async function viaRelay(relay: string, direct: () => string): Promise<unknown> {
  for (const url of [relay, direct()]) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* source suivante */
    }
  }
  throw new Error("indisponible");
}

/** Mémoire des derniers graphiques chargés : changer de durée de bougie est instantané. */
const memory = new Map<string, Bar[]>();
export const memoryKey = (s: ChartSource, i: Interval) => (s.kind === "local" ? "" : `${JSON.stringify(s)}:${i}`);
export function remembered(s: ChartSource, i: Interval): Bar[] | null {
  return memory.get(memoryKey(s, i)) ?? null;
}

export async function loadBars(s: ChartSource, i: Interval): Promise<Bar[]> {
  const bars = await fetchBars(s, i);
  if (s.kind !== "local" && bars.length) memory.set(memoryKey(s, i), bars);
  return bars;
}

async function fetchBars(s: ChartSource, i: Interval): Promise<Bar[]> {
  if (s.kind === "hyperliquid") {
    const lookback: Record<Interval, number> = { "1m": 6 * 3600_000, "5m": 2 * 86_400_000, "15m": 5 * 86_400_000, "1h": 20 * 86_400_000, "4h": 80 * 86_400_000, "1d": 400 * 86_400_000 };
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "candleSnapshot", req: { coin: s.coin, interval: i, startTime: Date.now() - lookback[i] } }),
    });
    const list = (await res.json()) as { t: number; o: string; h: string; l: string; c: string; v: string }[];
    return list.map((c) => ({ time: Math.floor(c.t / 1000) as UTCTimestamp, open: +c.o, high: +c.h, low: +c.l, close: +c.c, volume: +c.v }));
  }
  if (s.kind === "binance") {
    const res = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${s.symbol}&interval=${i}&limit=1000`);
    if (!res.ok) throw new Error("indisponible");
    const list = (await res.json()) as [number, string, string, string, string, string][];
    return list.map((r) => ({ time: Math.floor(r[0] / 1000) as UTCTimestamp, open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] }));
  }
  if (s.kind === "gecko") {
    const json = (await viaRelay(`/api/ohlc?src=gecko&network=${s.network}&pool=${s.pool}&i=${i}`, () => {
      const [tf, agg] = i === "1d" ? ["day", 1] : i === "4h" ? ["hour", 4] : i === "1h" ? ["hour", 1] : ["minute", parseInt(i, 10)];
      return `https://api.geckoterminal.com/api/v2/networks/${s.network}/pools/${s.pool}/ohlcv/${tf}?aggregate=${agg}&limit=1000&currency=usd`;
    })) as { data?: { attributes?: { ohlcv_list?: number[][] } } };
    const list = json.data?.attributes?.ohlcv_list;
    if (!list) throw new Error("vide");
    return list
      .map((r) => ({ time: r[0] as UTCTimestamp, open: r[1], high: r[2], low: r[3], close: r[4], volume: r[5] }))
      .sort((a, b) => a.time - b.time);
  }
  if (s.kind === "coingecko") {
    const days = i === "15m" ? 1 : i === "4h" ? 30 : 365;
    const list = (await viaRelay(`/api/ohlc?src=coingecko&id=${s.id}&i=${i}`, () => `https://api.coingecko.com/api/v3/coins/${s.id}/ohlc?vs_currency=usd&days=${days}`)) as number[][];
    if (!Array.isArray(list)) throw new Error("vide");
    return list.map((r) => ({ time: Math.floor(r[0] / 1000) as UTCTimestamp, open: r[1], high: r[2], low: r[3], close: r[4], volume: 0 }));
  }
  // Mèmes Tiers-État : bougies de capitalisation (SOL) calculées à partir des échanges
  const sec = SECONDS[i];
  const launch = s.createdAt ? Date.parse(s.createdAt) : undefined;
  const vol = new Map<number, number>();
  for (const t of s.trades) {
    const k = Math.floor(Date.parse(t.block_time) / 1000 / sec) * sec;
    vol.set(k, (vol.get(k) ?? 0) + Number(t.sol_amount));
  }
  return buildCandles(s.trades, sec, launch).map((c) => ({ ...c, time: c.time as UTCTimestamp, volume: vol.get(c.time) ?? 0 }));
}

/** Comment le graphique est tenu à jour, affiché dans sa légende. */
export type LiveMode = "transactions" | "direct" | "prix";

/**
 * Flux en direct : bougies Hyperliquid et Binance en continu ; memecoins Solana écoutés sur la blockchain
 * (chaque échange met la bougie à jour) ; ailleurs, le prix toutes les 3 s fait vivre la dernière bougie.
 * `last` donne la dernière bougie affichée. Renvoie une fonction d'arrêt.
 */
export function subscribeBars(
  s: ChartSource,
  i: Interval,
  onBar: (b: Bar) => void,
  onLive: (on: boolean, mode?: LiveMode) => void,
  last?: () => Bar | undefined,
): () => void {
  if (s.kind === "gecko" && s.chain) return tickDex(s, i, onBar, onLive, last);
  if (s.kind === "binance") return klineStream(`wss://data-stream.binance.vision/ws/${s.symbol.toLowerCase()}@kline_${i}`, onBar, onLive, (m) => {
    const k = (m as { k?: { t: number; o: string; h: string; l: string; c: string; v: string } }).k;
    return k ? { time: Math.floor(k.t / 1000) as UTCTimestamp, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v } : null;
  });
  if (s.kind !== "hyperliquid") return () => undefined;
  return klineStream(
    "wss://api.hyperliquid.xyz/ws",
    onBar,
    onLive,
    (m) => {
      const x = m as { channel?: string; data?: { t: number; o: string; h: string; l: string; c: string; v: string } };
      if (x.channel !== "candle" || !x.data) return null;
      const c = x.data;
      return { time: Math.floor(c.t / 1000) as UTCTimestamp, open: +c.o, high: +c.h, low: +c.l, close: +c.c, volume: +c.v };
    },
    JSON.stringify({ method: "subscribe", subscription: { type: "candle", coin: s.coin, interval: i } }),
  );
}

/** Flux de bougies d'une plateforme (websocket) : se reconnecte tout seul si la connexion tombe. */
function klineStream(url: string, onBar: (b: Bar) => void, onLive: (on: boolean, mode?: LiveMode) => void, parse: (m: unknown) => Bar | null, hello?: string): () => void {
  let stop = false;
  let ws: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      if (hello) ws?.send(hello);
      onLive(true, "direct");
    };
    ws.onmessage = (e) => {
      try {
        const b = parse(JSON.parse(e.data as string));
        if (b) onBar(b);
      } catch {
        /* message illisible : ignoré */
      }
    };
    ws.onclose = () => {
      if (stop) return;
      onLive(false);
      retry = setTimeout(open, 3000);
    };
  };
  open();
  return () => {
    stop = true;
    if (retry) clearTimeout(retry);
    ws?.close();
  };
}

/** Prix du SOL en dollars (Jupiter), partagé par tous les graphiques ouverts et relu toutes les 30 s. */
let solUsd: { value: number; at: number } | null = null;
async function solPrice(): Promise<number | null> {
  if (solUsd && Date.now() - solUsd.at < 30_000) return solUsd.value;
  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${SOL_MINT}`);
    const v = Number(((await res.json()) as Record<string, { usdPrice?: number }>)[SOL_MINT]?.usdPrice);
    if (Number.isFinite(v) && v > 0) solUsd = { value: v, at: Date.now() };
  } catch {
    /* garde la dernière valeur connue */
  }
  return solUsd?.value ?? null;
}

/**
 * Memecoins : sur Solana, le navigateur écoute la blockchain (chaque échange met la bougie à jour, volume compris) ;
 * le prix (Jupiter sur Solana, DexScreener ailleurs) est aussi relu régulièrement, plus souvent quand l'écoute directe est indisponible.
 * Pause quand l'onglet est caché.
 */
function tickDex(s: Extract<ChartSource, { kind: "gecko" }>, i: Interval, onBar: (b: Bar) => void, onLive: (on: boolean, mode?: LiveMode) => void, last?: () => Bar | undefined): () => void {
  let stop = false;
  /** null : pas d'écoute directe ; "transactions" : chaque échange arrive avec son prix ; "signal" : on sait seulement qu'un échange a eu lieu */
  let streaming: null | "transactions" | "signal" = null;
  const sec = SECONDS[i];
  const { chain = "", pool: pair, token } = s;

  // Met à jour (ou ouvre) la bougie en cours avec un prix, et ajoute le volume échangé
  const push = (price: number, volume = 0) => {
    const prev = last?.();
    if (stop || !Number.isFinite(price) || price <= 0) return;
    const bucket = (Math.floor(Date.now() / 1000 / sec) * sec) as UTCTimestamp;
    // Historique pas encore disponible (service limité) : le graphique démarre avec le prix en direct
    if (!prev) onBar({ time: bucket, open: price, high: price, low: price, close: price, volume });
    else if (bucket === prev.time) onBar({ ...prev, high: Math.max(prev.high, price), low: Math.min(prev.low, price), close: price, volume: prev.volume + volume });
    else if (bucket > prev.time) onBar({ time: bucket, open: prev.close, high: Math.max(prev.close, price), low: Math.min(prev.close, price), close: price, volume });
  };

  let busy = false;
  let lastTick = 0;
  const tick = async () => {
    if (stop || busy || document.hidden) return;
    busy = true;
    lastTick = Date.now();
    try {
      let price: number;
      if (chain === "solana" && token) {
        const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${token}`);
        if (!res.ok) return;
        price = Number(((await res.json()) as Record<string, { usdPrice?: number }>)[token]?.usdPrice);
      } else {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chain}/${pair}`);
        if (!res.ok) return;
        const j = (await res.json()) as { pairs?: { priceUsd?: string }[]; pair?: { priceUsd?: string } };
        price = Number((j.pairs?.[0] ?? j.pair)?.priceUsd);
      }
      push(price);
      if (!streaming) onLive(true, "prix");
    } catch {
      /* réseau indisponible : l'historique continue de se recharger */
    } finally {
      busy = false;
    }
  };

  // Écoute directe de la blockchain (Solana)
  let lastPing = 0;
  const unwatch =
    chain === "solana"
      ? watchSolanaMarket({
          pair,
          dex: s.dex,
          quote: s.quote,
          onLive: (on, mode) => {
            streaming = on ? mode : null;
            // Écoute coupée (réseau, onglet caché) : le prix relu toutes les 3 s prend le relais
            onLive(true, on ? (mode === "transactions" ? "transactions" : "direct") : "prix");
          },
          onTick: (t) =>
            void solPrice().then((sol) => {
              if (sol) push(t.priceSol * sol, t.volumeSol * sol);
            }),
          // Une transaction a eu lieu sur un DEX dont on ne lit pas le prix directement : on le relit aussitôt (au plus 1 fois/s)
          onPing: () => {
            if (Date.now() - lastPing < 1000) return;
            lastPing = Date.now();
            void tick();
          },
        })
      : null;

  void tick();
  if (s.chain === "solana") void solPrice();
  // Sans écoute directe : prix relu toutes les 3 s. Avec signal de transaction : filet de sécurité toutes les 15 s.
  // Avec les échanges eux-mêmes : rien à relire (sans échange, le prix ne bouge pas).
  const id = setInterval(() => {
    if (streaming === "transactions") return;
    if (streaming === "signal" && Date.now() - lastTick < 15_000) return;
    void tick();
  }, 3_000);
  return () => {
    stop = true;
    clearInterval(id);
    unwatch?.();
  };
}
