import { describe, expect, it } from "vitest";
import { backtest, type Candle } from "@/lib/backtest";

const series = (closes: number[]): Candle[] => closes.map((c, i) => ({ time: i, open: i ? closes[i - 1] : c, high: c * 1.001, low: c * 0.999, close: c }));

describe("backtest", () => {
  it("une tendance qui monte puis baisse : le croisement gagne à la hausse et sort à la baisse", () => {
    const up = Array.from({ length: 120 }, (_, i) => 100 + i);
    const down = Array.from({ length: 120 }, (_, i) => 219 - i * 1.5);
    const r = backtest(series([...Array(60).fill(100), ...up, ...down]), "croisement", "long", 0);
    expect(r.trades.length).toBeGreaterThan(0);
    expect(r.trades[0].side).toBe("long");
    expect(r.totalPct).toBeGreaterThan(r.holdPct);
  });
  it("les frais coûtent : même stratégie, résultat plus bas avec frais", () => {
    const zig = Array.from({ length: 300 }, (_, i) => 100 + 10 * Math.sin(i / 6));
    const a = backtest(series(zig), "rsi", "long", 0);
    const b = backtest(series(zig), "rsi", "long", 0.5);
    expect(b.totalPct).toBeLessThan(a.totalPct);
  });
  it("pas de données : pas de trade", () => {
    const r = backtest(series([100, 100, 100]), "cassure");
    expect(r.trades).toHaveLength(0);
    expect(r.winRate).toBeNull();
  });
  it("aucune donnée du futur : on entre à l'ouverture de la bougie suivant le signal", () => {
    const closes = [...Array(25).fill(10), 20, 21, 22];
    const r = backtest(series(closes), "cassure", "long", 0);
    expect(r.trades[0].entryTime).toBe(26);
  });
});
