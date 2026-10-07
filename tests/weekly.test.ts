import { describe, expect, it } from "vitest";
import { rankWeek, weekStart, winnerOf } from "@/lib/weekly";

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

describe("rankWeek", () => {
  const tokens = [
    { mint: "A", creator_wallet: "cA", creator_sold_pct: 0 },
    { mint: "B", creator_wallet: "cB", creator_sold_pct: 80 },
    { mint: "C", creator_wallet: "cC", creator_sold_pct: null },
  ];
  const trades = [
    { mint: "A", trader_wallet: "x", sol_amount: 1 },
    { mint: "A", trader_wallet: "y", sol_amount: 1 },
    { mint: "A", trader_wallet: "cA", sol_amount: 50 },
    { mint: "B", trader_wallet: "x", sol_amount: 10 },
    { mint: "C", trader_wallet: "z", sol_amount: 1.5 },
  ];

  it("ignore les échanges du créateur et met les « revendus » hors concours", () => {
    const r = rankWeek(trades, tokens);
    expect(r.map((e) => e.mint)).toEqual(["A", "C", "B"]);
    expect(r[0]).toMatchObject({ volumeSol: 2, traders: 2, score: 2.1, disqualified: false });
    expect(r[2].disqualified).toBe(true);
    expect(winnerOf(r)?.mint).toBe("A");
  });

  it("pas de gagnant sans échange", () => {
    expect(winnerOf(rankWeek([], tokens))).toBeNull();
  });
});
