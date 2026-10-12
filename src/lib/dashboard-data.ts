import "server-only";
import { memo } from "@/lib/memo";
import { topCryptos } from "@/lib/market-feeds";
import type { MarketItem } from "@/components/market/MarketRow";

/** Les grandes cryptos affichées en cartes en haut du tableau de bord. */
const MAJORS = ["BTC", "ETH", "SOL", "BNB"];

export type Movers = { gainers: MarketItem[]; losers: MarketItem[] };
export type PricePoint = { at: number; close: number; changePct: number };

/** BTC, ETH, SOL, BNB (CoinGecko, avec leur courbe 7 jours). */
export async function majors(): Promise<MarketItem[]> {
  const all = await topCryptos();
  return MAJORS.flatMap((s) => all.filter((c) => c.symbol === s).slice(0, 1));
}

/** Plus fortes hausses et baisses sur 24 h parmi les 100 plus grosses cryptos (hors stablecoins). */
export async function movers(n = 5): Promise<Movers> {
  const top = (await topCryptos()).slice(0, 100).filter((c) => c.change24 !== null);
  const sorted = [...top].sort((a, b) => (b.change24 ?? 0) - (a.change24 ?? 0));
  return { gainers: sorted.slice(0, n), losers: sorted.slice(-n).reverse() };
}

/** Les dernières heures du Bitcoin (bougies d'une heure Hyperliquid) : clôture et variation de l'heure. Cache 60 s. */
export function btcHours(n = 8): Promise<PricePoint[]> {
  return memo(`dash:btc-hours:${n}`, 60_000, async () => {
    const now = Date.now();
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "candleSnapshot", req: { coin: "BTC", interval: "1h", startTime: now - (n + 1) * 3_600_000, endTime: now } }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`hyperliquid ${res.status}`);
    const candles = (await res.json()) as { t: number; o: string; c: string }[];
    return candles
      .slice(-n)
      .reverse()
      .map((k) => ({ at: k.t, close: Number(k.c), changePct: ((Number(k.c) - Number(k.o)) / Number(k.o)) * 100 }));
  });
}
