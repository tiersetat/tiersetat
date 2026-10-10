import { describe, expect, it } from "vitest";
import { aggregateTraders, holdLabel } from "@/lib/traders";

const t = (w: string, side: "buy" | "sell", sol: number, tokens: number, at: string) => ({
  trader_wallet: w,
  side,
  sol_amount: sol,
  token_amount: tokens,
  price_sol: sol / tokens,
  block_time: at,
  signature: `${w}-${at}`,
});

describe("aggregateTraders", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  const trades = [
    t("A", "buy", 1, 1_000_000, "2026-10-10T10:00:00Z"),
    t("A", "buy", 1, 500_000, "2026-10-10T11:00:00Z"),
    t("B", "buy", 2, 2_000_000, "2026-10-10T09:00:00Z"),
    t("B", "sell", 3, 2_000_000, "2026-10-10T11:30:00Z"),
  ];
  const rows = aggregateTraders(trades, 0.000002, now);

  it("calcule la position, le gain et le prix d'entrée moyen de chaque trader", () => {
    const a = rows.find((r) => r.wallet === "A")!;
    expect(a.heldTokens).toBe(1_500_000);
    expect(a.valueSol).toBeCloseTo(3);
    expect(a.pnlSol).toBeCloseTo(1);
    // 2 SOL pour 1,5 M tokens → prix moyen × 1 Md = capitalisation moyenne d'entrée
    expect(a.avgEntryMcapSol).toBeCloseTo((2 / 1_500_000) * 1e9);
    expect(a.holdMs).toBe(2 * 3_600_000);
  });

  it("mesure la détention d'une position soldée jusqu'à la dernière vente, et trie par valeur détenue", () => {
    const b = rows.find((r) => r.wallet === "B")!;
    expect(b.closed).toBe(true);
    expect(b.pnlSol).toBeCloseTo(1);
    expect(b.holdMs).toBe(2.5 * 3_600_000);
    expect(rows[0].wallet).toBe("A");
  });

  it("affiche des durées lisibles", () => {
    expect(holdLabel(11 * 60_000)).toBe("11 min");
    expect(holdLabel((5 * 60 + 18) * 60_000)).toBe("5 h 18 min");
    expect(holdLabel((2 * 24 + 20) * 3_600_000)).toBe("2 j 20 h");
  });
});
