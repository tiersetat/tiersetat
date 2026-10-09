import { describe, expect, it } from "vitest";
import { buildCandles, changeSinceLaunch, defaultInterval, type TradeRow } from "@/lib/candles";

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

describe("lancement et variation", () => {
  const t0 = Date.parse("2026-10-09T10:00:00Z");
  const trade = (minutes: number, mcap: number) => ({ signature: String(minutes), trader_wallet: "W", side: "buy" as const, sol_amount: 1, token_amount: 1, price_sol: mcap / 1e9, block_time: new Date(t0 + minutes * 60_000).toISOString() });

  it("ajoute un point de départ à 2 SOL au lancement", () => {
    const c = buildCandles([trade(5, 4)], 60, t0);
    expect(c[0]).toMatchObject({ time: t0 / 1000, open: 2, close: 2 });
    expect(c).toHaveLength(2);
  });
  it("sans échange : seulement le point de départ", () => {
    expect(buildCandles([], 60, t0)).toEqual([{ time: t0 / 1000, open: 2, high: 2, low: 2, close: 2 }]);
  });
  it("variation depuis le lancement", () => {
    expect(changeSinceLaunch(buildCandles([trade(1, 5)], 60, t0))).toBeCloseTo(150);
    expect(changeSinceLaunch([])).toBeNull();
  });
  it("intervalle par défaut selon l'âge", () => {
    expect(defaultInterval(30 * 60_000)).toBe(60);
    expect(defaultInterval(5 * 3_600_000)).toBe(300);
    expect(defaultInterval(2 * 86_400_000)).toBe(900);
    expect(defaultInterval(10 * 86_400_000)).toBe(3600);
  });
});
