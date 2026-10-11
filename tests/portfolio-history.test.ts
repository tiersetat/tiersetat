import { describe, expect, it } from "vitest";
import { addSnapshot, DEMO_TOTAL_USD, demoHistory, gainOver, valueAt, windowPoints } from "@/lib/portfolio-history";

const now = Date.UTC(2026, 9, 11, 12);

describe("historique du portefeuille", () => {
  const demo = demoHistory(now);
  it("la démo part de 0 $ et finit au solde de démonstration", () => {
    expect(demo[0].v).toBe(0);
    expect(demo[demo.length - 1].v).toBe(DEMO_TOTAL_USD);
  });
  it("les gains de la démo sont positifs sur toutes les fenêtres", () => {
    for (const w of ["1h", "24h", "7j", "total"] as const) expect(gainOver(demo, w, now)!.usd).toBeGreaterThan(0);
    expect(gainOver(demo, "total", now)!.usd).toBeCloseTo(DEMO_TOTAL_USD);
  });
  it("lit la valeur à une date et découpe une fenêtre", () => {
    const pts = [{ t: 0, v: 10 }, { t: 100, v: 20 }, { t: 200, v: 15 }];
    expect(valueAt(pts, 150)).toBe(20);
    expect(windowPoints(pts, "1h", 200)[0]).toEqual({ t: 200 - 3_600_000, v: 10 });
  });
  it("enregistre au plus un relevé toutes les 5 minutes", () => {
    let pts = addSnapshot([], 100, 0);
    pts = addSnapshot(pts, 110, 60_000);
    expect(pts).toEqual([{ t: 60_000, v: 110 }]);
    pts = addSnapshot(pts, 120, 10 * 60_000);
    expect(pts).toHaveLength(2);
  });
});
