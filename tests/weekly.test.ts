import { describe, expect, it } from "vitest";
import { MIN_HOLDERS, rankWeek, weekStart, winnerOf } from "@/lib/weekly";

describe("weekStart (heure de Paris)", () => {
  it("mercredi → lundi 0 h Paris (UTC+2 en été)", () => {
    expect(new Date(weekStart(Date.parse("2026-10-07T12:00:00Z"))).toISOString()).toBe("2026-10-04T22:00:00.000Z");
  });
  it("dimanche soir reste dans la même semaine", () => {
    expect(new Date(weekStart(Date.parse("2026-10-11T21:30:00Z"))).toISOString()).toBe("2026-10-04T22:00:00.000Z");
  });
  it("lundi 0 h 30 Paris démarre une nouvelle semaine", () => {
    expect(new Date(weekStart(Date.parse("2026-10-11T22:30:00Z"))).toISOString()).toBe("2026-10-11T22:00:00.000Z");
  });
  it("semaine précédente, et hiver (UTC+1)", () => {
    expect(new Date(weekStart(Date.parse("2026-10-07T12:00:00Z"), 1)).toISOString()).toBe("2026-09-27T22:00:00.000Z");
    expect(new Date(weekStart(Date.parse("2026-12-02T12:00:00Z"))).toISOString()).toBe("2026-11-29T23:00:00.000Z");
  });
});

describe("rankWeek (capitalisation)", () => {
  const buy = (mint: string, w: string, price: number, at = "2026-10-08T10:00:00Z") => ({ mint, trader_wallet: w, side: "buy" as const, token_amount: 1000, price_sol: price, block_time: at });
  const holders = (mint: string, n: number, price: number) => Array.from({ length: n }, (_, i) => buy(mint, `${mint}-w${i}`, price));
  const tokens = [
    { mint: "A", creator_wallet: "cA", creator_sold_pct: 0 },
    { mint: "B", creator_wallet: "cB", creator_sold_pct: 0 },
    { mint: "C", creator_wallet: "cC", creator_sold_pct: 80 },
    { mint: "D", creator_wallet: "cD", creator_sold_pct: null },
  ];

  it("la plus grosse capitalisation gagne, parmi les mèmes assez détenus", () => {
    const trades = [...holders("A", MIN_HOLDERS, 5e-9), ...holders("B", MIN_HOLDERS, 8e-9), ...holders("C", 30, 50e-9), ...holders("D", 5, 90e-9)];
    const r = rankWeek(trades, tokens);
    expect(r.map((e) => e.mint)).toEqual(["B", "A", "D", "C"]);
    expect(r[0]).toMatchObject({ marketCapSol: 8, holders: MIN_HOLDERS, eligible: true });
    expect(r.find((e) => e.mint === "D")?.eligible).toBe(false); // trop peu de détenteurs
    expect(r.find((e) => e.mint === "C")?.disqualified).toBe(true); // créateur a revendu
    expect(winnerOf(r)?.mint).toBe("B");
  });

  it("le créateur ne compte pas comme détenteur, un vendeur qui a tout revendu non plus", () => {
    const trades = [...holders("A", MIN_HOLDERS - 1, 5e-9), buy("A", "cA", 5e-9), buy("A", "x", 5e-9), { ...buy("A", "x", 5e-9), side: "sell" as const }];
    const a = rankWeek(trades, tokens).find((e) => e.mint === "A");
    expect(a?.holders).toBe(MIN_HOLDERS - 1);
    expect(a?.eligible).toBe(false);
  });

  it("capitalisation au dernier prix échangé", () => {
    const trades = [...holders("A", MIN_HOLDERS, 5e-9), buy("A", "late", 12e-9, "2026-10-10T20:00:00Z")];
    expect(rankWeek(trades, tokens).find((e) => e.mint === "A")?.marketCapSol).toBeCloseTo(12);
  });

  it("pas de gagnant si aucun mème n'a assez de détenteurs", () => {
    expect(winnerOf(rankWeek(holders("A", 3, 5e-9), tokens))).toBeNull();
  });
});
