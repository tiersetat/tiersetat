import { describe, expect, it } from "vitest";
import { buildPortfolio } from "@/lib/portfolio";

const h = (mint: string, amount: number, priceSol: number) => ({ mint, name: mint, ticker: mint.toUpperCase(), image_url: "", amount, priceSol });

describe("buildPortfolio", () => {
  it("calcule valeur et gains/pertes par token et au total", () => {
    const { lines, total } = buildPortfolio(
      [h("a", 1_000_000, 3e-9), h("b", 500_000, 1e-9)],
      [
        { mint: "a", side: "buy", sol_amount: 0.002 },
        { mint: "a", side: "sell", sol_amount: 0.0005 },
        { mint: "b", side: "buy", sol_amount: 0.001 },
      ],
    );
    const a = lines.find((l) => l.mint === "a")!;
    expect(a.valueSol).toBeCloseTo(0.003);
    expect(a.pnlSol).toBeCloseTo(0.003 + 0.0005 - 0.002);
    expect(a.pnlPct).toBeCloseTo(75);
    const b = lines.find((l) => l.mint === "b")!;
    expect(b.pnlSol).toBeCloseTo(-0.0005);
    expect(lines[0].mint).toBe("a"); // trié par valeur
    expect(total.valueSol).toBeCloseTo(0.0035);
  });

  it("pas de % sans achat indexé (tokens reçus autrement)", () => {
    const { lines } = buildPortfolio([h("c", 10, 1)], []);
    expect(lines[0].pnlPct).toBeNull();
    expect(lines[0].pnlSol).toBe(10);
  });
});
