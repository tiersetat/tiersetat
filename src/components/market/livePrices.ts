"use client";

import { useSyncExternalStore } from "react";

/**
 * Centrale des prix en direct, partagée par toute l'appli (une seule connexion par source) :
 * - Hyperliquid (flux WebSocket « allMids ») : grandes cryptos, actions, indices, or… ; mise à jour en continu.
 * - Jupiter (Solana) : prix des memecoins Solana, interrogés par lots toutes les 3 s (rafraîchis toutes les ~5 s chez Jupiter).
 * - DexScreener (autres blockchains) : par lots toutes les 4 s (rafraîchis ~toutes les 30 s chez DexScreener).
 * Seuls les tokens affichés à l'écran sont suivis.
 * La variation 24 h des marchés Hyperliquid est calculée sur le prix de la veille (une seule lecture).
 */
/** `dir` : sens du dernier mouvement de prix (pour un bref éclair vert ou rouge). */
export type Quote = { price: number; change24: number | null; mcap: number | null; at: number; dir: "up" | "down" | null };

const quotes = new Map<string, Quote>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string, q: Omit<Quote, "dir">) {
  const prev = quotes.get(key);
  if (prev && prev.price === q.price && prev.change24 === q.change24 && prev.mcap === q.mcap) return;
  const dir = !prev || prev.price === q.price ? (prev?.dir ?? null) : q.price > prev.price ? "up" : "down";
  quotes.set(key, { ...q, dir });
  listeners.get(key)?.forEach((l) => l());
}

/* ---------- Hyperliquid ---------- */
const hlDexes = new Set<string>(); // "" = marché principal (cryptos), "xyz", "para"… (actions, indices)
const prevDay = new Map<string, number>();
let ws: WebSocket | null = null;
let wsRetry: ReturnType<typeof setTimeout> | null = null;

async function loadPrevDay(dex: string) {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dex ? { type: "metaAndAssetCtxs", dex } : { type: "metaAndAssetCtxs" }),
    });
    const [meta, ctx] = (await res.json()) as [{ universe: { name: string }[] }, { prevDayPx?: string }[]];
    meta.universe.forEach((a, i) => {
      const p = Number(ctx[i]?.prevDayPx);
      if (p > 0) prevDay.set(a.name, p);
    });
  } catch {
    /* sans prix de la veille, la variation reste celle de la page */
  }
}

function subscribeDex(dex: string) {
  ws?.send(JSON.stringify({ method: "subscribe", subscription: dex ? { type: "allMids", dex } : { type: "allMids" } }));
}

function connectHl() {
  if (ws || typeof WebSocket === "undefined") return;
  ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
  ws.onopen = () => hlDexes.forEach(subscribeDex);
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data as string) as { channel?: string; data?: { mids?: Record<string, string> } };
    if (m.channel !== "allMids" || !m.data?.mids) return;
    const now = Date.now();
    for (const [name, mid] of Object.entries(m.data.mids)) {
      const key = `hl:${name}`;
      if (!listeners.has(key)) continue;
      const price = Number(mid);
      const prev = prevDay.get(name);
      const old = quotes.get(key);
      emit(key, { price, change24: prev ? ((price - prev) / prev) * 100 : (old?.change24 ?? null), mcap: null, at: now });
    }
  };
  ws.onclose = () => {
    ws = null;
    if (listeners.size) wsRetry = setTimeout(connectHl, 3000);
  };
}

function ensureHl(dex: string) {
  if (!hlDexes.has(dex)) {
    hlDexes.add(dex);
    void loadPrevDay(dex);
    if (ws?.readyState === WebSocket.OPEN) subscribeDex(dex);
  }
  connectHl();
}

/* ---------- DexScreener ---------- */
const dexWanted = new Map<string, Set<string>>(); // blockchain → adresses affichées
let dexTimer: ReturnType<typeof setInterval> | null = null;

type DexPair = { baseToken: { address: string }; priceUsd?: string; marketCap?: number; fdv?: number; liquidity?: { usd?: number }; priceChange?: { h24?: number } };

/** Solana : Jupiter, plus frais que DexScreener. La capitalisation est recalculée au prorata du prix. */
async function pollJupiter(all: string[]) {
  const now = Date.now();
  for (let i = 0; i < all.length; i += 50) {
    try {
      const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${all.slice(i, i + 50).join(",")}`);
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, { usdPrice?: number; priceChange24h?: number }>;
      for (const [addr, v] of Object.entries(data)) {
        if (!(Number(v.usdPrice) > 0)) continue;
        emit(`dex:solana:${addr}`, { price: Number(v.usdPrice), change24: v.priceChange24h ?? null, mcap: null, at: now });
      }
    } catch {
      /* lot suivant */
    }
  }
}

let dexRound = 0;
async function pollDex() {
  if (document.hidden) return;
  const now = Date.now();
  dexRound++;
  for (const [chain, set] of dexWanted) {
    const all = [...set];
    if (chain === "solana") {
      await pollJupiter(all);
      continue;
    }
    // Autres blockchains : DexScreener ne se rafraîchit que toutes les ~30 s, inutile de l'interroger plus d'une fois sur 3
    if (dexRound % 3 !== 1) continue;
    for (let i = 0; i < all.length; i += 30) {
      try {
        const res = await fetch(`https://api.dexscreener.com/tokens/v1/${chain}/${all.slice(i, i + 30).join(",")}`);
        if (!res.ok) continue;
        const pairs = (await res.json()) as DexPair[];
        const best = new Map<string, DexPair>();
        for (const p of pairs) {
          const a = p.baseToken.address.toLowerCase();
          const cur = best.get(a);
          if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(a, p);
        }
        // Les adresses Solana sont sensibles à la casse : on retrouve l'adresse d'origine de chaque réponse
        const original = new Map(all.map((x) => [x.toLowerCase(), x]));
        for (const [a, p] of best) {
          const price = Number(p.priceUsd);
          const addr = original.get(a);
          if (!(price > 0) || !addr) continue;
          emit(`dex:${chain}:${addr}`, { price, change24: p.priceChange?.h24 ?? null, mcap: p.marketCap ?? p.fdv ?? null, at: now });
        }
      } catch {
        /* lot suivant */
      }
    }
  }
}

function ensureDexTimer() {
  if (dexTimer) return;
  dexTimer = setInterval(pollDex, 3_000);
  setTimeout(pollDex, 300);
}

/* ---------- Abonnement ---------- */
/** La clé « en direct » d'un élément de liste, ou null s'il n'a pas de source en direct. */
export function liveKeyOf(t: { address: string; symbol: string; href?: string; chain?: string }): string | null {
  if (t.href?.startsWith("/bourse/")) return `hl:${decodeURIComponent(t.href.slice("/bourse/".length))}`;
  if (t.href?.startsWith("/crypto/")) return `hl:${t.symbol.toUpperCase()}`;
  if (t.chain) return `dex:${t.chain}:${t.address}`;
  return null;
}

function subscribe(key: string, cb: () => void): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(cb);
  if (key.startsWith("hl:")) {
    const name = key.slice(3);
    ensureHl(name.includes(":") ? name.split(":")[0] : "");
  } else if (key.startsWith("dex:")) {
    const [, chain, address] = key.split(":");
    if (!dexWanted.has(chain)) dexWanted.set(chain, new Set());
    dexWanted.get(chain)!.add(address);
    ensureDexTimer();
  }
  return () => {
    set!.delete(cb);
    if (set!.size) return;
    listeners.delete(key);
    if (key.startsWith("dex:")) {
      const [, chain, address] = key.split(":");
      dexWanted.get(chain)?.delete(address);
      if ([...dexWanted.values()].every((s) => s.size === 0) && dexTimer) {
        clearInterval(dexTimer);
        dexTimer = null;
      }
    }
    if (listeners.size === 0) {
      if (wsRetry) clearTimeout(wsRetry);
      ws?.close();
      ws = null;
      hlDexes.clear();
    }
  };
}

const noop = () => () => undefined;

/** Le prix en direct d'une clé (null tant qu'il n'est pas arrivé, ou sans source en direct). */
export function useLiveQuote(key: string | null): Quote | null {
  return useSyncExternalStore(
    key ? (cb) => subscribe(key, cb) : noop,
    () => (key ? (quotes.get(key) ?? null) : null),
    () => null,
  );
}
