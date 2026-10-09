import { PLATFORM_CURVE } from "@/lib/solana/platform";

export type TradeRow = {
  signature: string;
  trader_wallet: string;
  side: "buy" | "sell";
  sol_amount: number;
  token_amount: number;
  price_sol: number;
  block_time: string;
};

export type Candle = { time: number; open: number; high: number; low: number; close: number };

/**
 * Bougies de market cap (SOL) par intervalle, à partir des trades.
 * Chaque bougie s'ouvre au cours de clôture de la précédente (graphique continu).
 */
export function buildCandles(trades: TradeRow[], bucketSeconds = 60, launchAtMs?: number): Candle[] {
  const sorted = [...trades].sort((a, b) => Date.parse(a.block_time) - Date.parse(b.block_time));
  const candles: Candle[] = [];
  // Point de départ au lancement : la courbe démarre à la capitalisation initiale, même sans échange
  if (launchAtMs !== undefined && Number.isFinite(launchAtMs)) {
    const launch = Math.floor(launchAtMs / 1000 / bucketSeconds) * bucketSeconds;
    const firstTrade = sorted[0] ? Math.floor(Date.parse(sorted[0].block_time) / 1000 / bucketSeconds) * bucketSeconds : Infinity;
    if (launch < firstTrade) {
      const v = PLATFORM_CURVE.initialMarketCapSol;
      candles.push({ time: launch, open: v, high: v, low: v, close: v });
    }
  }
  for (const t of sorted) {
    const mcap = Number(t.price_sol) * PLATFORM_CURVE.totalSupply;
    const time = Math.floor(Date.parse(t.block_time) / 1000 / bucketSeconds) * bucketSeconds;
    const last = candles[candles.length - 1];
    if (last && last.time === time) {
      last.high = Math.max(last.high, mcap);
      last.low = Math.min(last.low, mcap);
      last.close = mcap;
    } else {
      const open = last ? last.close : PLATFORM_CURVE.initialMarketCapSol;
      candles.push({ time, open, high: Math.max(open, mcap), low: Math.min(open, mcap), close: mcap });
    }
  }
  return candles;
}

/** Variation de la capitalisation depuis le lancement, en % (null si aucune donnée). */
export function changeSinceLaunch(candles: Candle[]): number | null {
  const last = candles[candles.length - 1];
  return last ? (last.close / PLATFORM_CURVE.initialMarketCapSol - 1) * 100 : null;
}

export const INTERVALS = [
  { label: "1 min", seconds: 60 },
  { label: "5 min", seconds: 300 },
  { label: "15 min", seconds: 900 },
  { label: "1 h", seconds: 3600 },
] as const;

/** Intervalle adapté à l'âge du mème : bougies lisibles sans réglage. */
export function defaultInterval(ageMs: number): number {
  if (ageMs < 2 * 3_600_000) return 60;
  if (ageMs < 12 * 3_600_000) return 300;
  if (ageMs < 3 * 86_400_000) return 900;
  return 3600;
}
