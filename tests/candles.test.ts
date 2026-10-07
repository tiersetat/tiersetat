import { describe, expect, it } from "vitest";
import { buildCandles, type TradeRow } from "@/lib/candles";

const trade = (iso: string, price: number): TradeRow => ({
  signature: iso, trader_wallet: "x", side: "buy", sol_amount: 1, token_amount: 1, price_sol: price, block_time: iso,
});

describe("buildCandles", () => {
  it("regroupe par minute en market cap et enchaîne les bougies", () => {
    const c = buildCandles([
      trade("2026-10-06T10:00:10Z", 3e-9),
      trade("2026-10-06T10:00:50Z", 2.5e-9),
      trade("2026-10-06T10:00:30Z", 4e-9),
      trade("2026-10-06T10:02:00Z", 5e-9),
    ]);
    expect(c).toHaveLength(2);
    expect(c[0]).toMatchObject({ open: 2, close: 2.5, high: 4, low: 2 });
    expect(c[0].high).toBeCloseTo(4);
    expect(c[1].open).toBeCloseTo(2.5);
    expect(c[1].close).toBeCloseTo(5);
    expect(c[1].time - c[0].time).toBe(120);
  });
  it("renvoie une liste vide sans trades", () => {
    expect(buildCandles([])).toEqual([]);
  });
});
