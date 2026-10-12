import type { UTCTimestamp } from "lightweight-charts";
import { buildCandles, type TradeRow } from "@/lib/candles";

/** D'où viennent les bougies d'un graphique (données sérialisables, passées par les pages). */
export type ChartSource =
  | { kind: "hyperliquid"; coin: string }
  | { kind: "gecko"; network: string; pool: string; /** blockchain DexScreener, pour le prix en direct */ chain?: string }
  | { kind: "coingecko"; id: string }
  | { kind: "local"; trades: TradeRow[]; createdAt?: string };

export type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type Bar = { time: UTCTimestamp; open: number; high: number; low: number; close: number; volume: number };

export const LABELS: Record<Interval, string> = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1j" };
const SECONDS: Record<Interval, number> = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };

/** Durées proposées selon la source, et la durée par défaut. */
export function intervalsOf(s: ChartSource): Interval[] {
  if (s.kind === "coingecko") return ["15m", "4h", "1d"];
  return ["1m", "5m", "15m", "1h", "4h", "1d"];
}

/** Fréquence d'actualisation quand il n'y a pas de flux en direct (ms). */
export function pollMs(s: ChartSource): number | null {
  if (s.kind === "gecko") return 15_000;
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

/**
 * Flux en direct : bougies Hyperliquid en continu ; pour les tokens des DEX (GeckoTerminal),
 * le prix DexScreener toutes les 3 s fait vivre la dernière bougie entre deux rechargements de l'historique.
 * `last` donne la dernière bougie affichée. Renvoie une fonction d'arrêt.
 */
export function subscribeBars(s: ChartSource, i: Interval, onBar: (b: Bar) => void, onLive: (on: boolean) => void, last?: () => Bar | undefined): () => void {
  if (s.kind === "gecko" && s.chain) return tickDex(s.chain, s.pool, i, onBar, onLive, last);
  if (s.kind !== "hyperliquid") return () => undefined;
  let stop = false;
  const ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
  ws.onopen = () => {
    ws.send(JSON.stringify({ method: "subscribe", subscription: { type: "candle", coin: s.coin, interval: i } }));
    onLive(true);
  };
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data as string) as { channel?: string; data?: { t: number; o: string; h: string; l: string; c: string; v: string } };
    if (m.channel !== "candle" || !m.data) return;
    const c = m.data;
    onBar({ time: Math.floor(c.t / 1000) as UTCTimestamp, open: +c.o, high: +c.h, low: +c.l, close: +c.c, volume: +c.v });
  };
  ws.onclose = () => !stop && onLive(false);
  return () => {
    stop = true;
    ws.close();
  };
}

/** Prix DexScreener toutes les 3 s : met à jour (ou ouvre) la bougie en cours. Pause quand l'onglet est caché. */
function tickDex(chain: string, pair: string, i: Interval, onBar: (b: Bar) => void, onLive: (on: boolean) => void, last?: () => Bar | undefined): () => void {
  let stop = false;
  const sec = SECONDS[i];
  const tick = async () => {
    if (stop || document.hidden) return;
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chain}/${pair}`);
      if (!res.ok) return;
      const j = (await res.json()) as { pairs?: { priceUsd?: string }[]; pair?: { priceUsd?: string } };
      const price = Number((j.pairs?.[0] ?? j.pair)?.priceUsd);
      const prev = last?.();
      if (stop || !Number.isFinite(price) || price <= 0) return;
      const bucket = (Math.floor(Date.now() / 1000 / sec) * sec) as UTCTimestamp;
      // Historique pas encore disponible (service limité) : le graphique démarre avec le prix en direct
      if (!prev) onBar({ time: bucket, open: price, high: price, low: price, close: price, volume: 0 });
      else if (bucket === prev.time) onBar({ ...prev, high: Math.max(prev.high, price), low: Math.min(prev.low, price), close: price });
      else if (bucket > prev.time) onBar({ time: bucket, open: prev.close, high: Math.max(prev.close, price), low: Math.min(prev.close, price), close: price, volume: 0 });
      onLive(true);
    } catch {
      /* réseau indisponible : l'historique continue de se recharger */
    }
  };
  void tick();
  const id = setInterval(tick, 3_000);
  return () => {
    stop = true;
    clearInterval(id);
  };
}
