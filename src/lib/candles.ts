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
export function buildCandles(trades: TradeRow[], bucketSeconds = 60): Candle[] {
  const sorted = [...trades].sort((a, b) => Date.parse(a.block_time) - Date.parse(b.block_time));
  const candles: Candle[] = [];
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
