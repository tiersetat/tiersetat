import { describe, expect, it } from "vitest";
import { riskFlags, trustScore } from "@/lib/risk-flags";

const base = { ageMinutes: 600, creatorPct: 3, creatorSold: false, top10Pct: 20, top10Source: "chain" as const, reserveSol: 5, mintRevoked: true, freezeRevoked: true };

describe("note de fiabilité", () => {
  it("donne 100/100 à un token sans aucun signal de risque", () => {
    expect(trustScore(riskFlags(base))).toEqual({ score: 100, label: "Solide", tone: "ok" });
  });
  it("baisse la note quand le créateur détient beaucoup et a vendu", () => {
    const t = trustScore(riskFlags({ ...base, creatorPct: 30, creatorSold: true }));
    expect(t.score).toBe(60);
    expect(t.label).toBe("Prudence");
  });
  it("classe « Risqué » un token concentré, récent et dont le mint est actif", () => {
    const t = trustScore(riskFlags({ ...base, mintRevoked: false, top10Pct: 70, ageMinutes: 5 }));
    expect(t.label).toBe("Risqué");
  });
});
