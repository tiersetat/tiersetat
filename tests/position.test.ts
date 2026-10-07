import { describe, expect, it } from "vitest";
import { buildPosition, formatDuration } from "@/lib/position";

const t = (side: "buy" | "sell", sol: number, tokens: number, at: string) => ({
  side, sol_amount: sol, token_amount: tokens, price_sol: sol / tokens, block_time: at, signature: at,
});

describe("buildPosition", () => {
  it("position soldée avec gain", () => {
    const p = buildPosition([t("sell", 3, 1000, "2026-10-02T00:00:00Z"), t("buy", 1, 1000, "2026-10-01T00:00:00Z")], 0.01);
    expect(p.firstBuyAt).toBe("2026-10-01T00:00:00Z");
    expect(p.lastSellAt).toBe("2026-10-02T00:00:00Z");
    expect(p.closed).toBe(true);
    expect(p.pnlSol).toBeCloseTo(2);
    expect(p.pnlPct).toBeCloseTo(200);
    expect(p.multiple).toBeCloseTo(3);
  });

  it("position ouverte valorisée au prix actuel", () => {
    const p = buildPosition([t("buy", 2, 1000, "2026-10-01T00:00:00Z"), t("sell", 1, 500, "2026-10-01T01:00:00Z")], 0.001);
    expect(p.heldTokens).toBe(500);
    expect(p.valueSol).toBeCloseTo(0.5);
    expect(p.pnlSol).toBeCloseTo(-0.5);
    expect(p.closed).toBe(false);
    expect(p.avgBuyPrice).toBeCloseTo(0.002);
  });

  it("sans achat indexé : pas de pourcentage", () => {
    const p = buildPosition([t("sell", 1, 100, "2026-10-01T00:00:00Z")], 0);
    expect(p.pnlPct).toBeNull();
    expect(p.heldTokens).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formate minutes, heures et jours", () => {
    expect(formatDuration("2026-10-01T00:00:00Z", "2026-10-01T00:45:00Z")).toBe("45 min");
    expect(formatDuration("2026-10-01T00:00:00Z", "2026-10-01T02:05:00Z")).toBe("2 h 05 min");
    expect(formatDuration("2026-10-01T00:00:00Z", "2026-10-04T04:00:00Z")).toBe("3 j 4 h");
  });
});
