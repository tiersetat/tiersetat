import { describe, expect, it } from "vitest";
import { checkPlan, defaultPlan, pnlPct } from "@/lib/position-plan";

describe("outil position", () => {
  it("calcule risque, gain et ratio d'un short", () => {
    const r = checkPlan({ side: "short", entry: 0.41415, stop: 0.426, target: 0.4, partial: 0.4055 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.riskPct).toBeCloseTo(2.86, 1);
      expect(r.rewardPct).toBeCloseTo(3.42, 1);
      expect(r.ratio).toBeCloseTo(1.19, 1);
    }
  });
  it("refuse un plan incohérent", () => {
    expect(checkPlan({ side: "short", entry: 1, stop: 0.9, target: 0.8 }).ok).toBe(false);
    expect(checkPlan({ side: "long", entry: 1, stop: 0.9, target: 1.2, partial: 1.3 }).ok).toBe(false);
  });
  it("gain ou perte en cours", () => {
    expect(pnlPct({ side: "short", entry: 100, stop: 105, target: 90 }, 95)).toBeCloseTo(5);
    expect(pnlPct({ side: "long", entry: 100, stop: 95, target: 110 }, 95)).toBeCloseTo(-5);
  });
  it("plan par défaut cohérent", () => {
    expect(checkPlan(defaultPlan("long", 50)).ok).toBe(true);
    expect(checkPlan(defaultPlan("short", 50)).ok).toBe(true);
  });
});
