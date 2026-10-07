import { describe, expect, it } from "vitest";
import { buyWarnings, riskFlags, type RiskReport } from "@/lib/risk-flags";

const base: RiskReport = {
  ageMinutes: 600,
  creatorPct: 2,
  creatorSold: false,
  top10Pct: 20,
  top10Source: "chain",
  reserveSol: 3,
  mintRevoked: true,
  freezeRevoked: true,
};

describe("riskFlags", () => {
  it("token sain : uniquement des badges verts", () => {
    const flags = riskFlags(base);
    expect(flags.every((f) => f.level === "ok")).toBe(true);
    expect(flags.map((f) => f.label)).toContain("Mint immuable");
    expect(buyWarnings(flags)).toEqual([]);
  });

  it("signale un token frais, un créateur dominant qui a vendu et peu de liquidité", () => {
    const flags = riskFlags({ ...base, ageMinutes: 5, creatorPct: 30, creatorSold: true, reserveSol: 0.1 });
    const levels = Object.fromEntries(flags.map((f) => [f.label, f.level]));
    expect(levels["Token très récent"]).toBe("warn");
    expect(levels["Créateur : 30 % de l'offre"]).toBe("danger");
    expect(levels["Le créateur a vendu"]).toBe("warn");
    expect(levels["Peu de liquidité"]).toBe("warn");
    expect(buyWarnings(flags)).toHaveLength(4);
  });

  it("précise quand la concentration est estimée depuis les échanges", () => {
    const flags = riskFlags({ ...base, top10Pct: 65, top10Source: "trades" });
    const top = flags.find((f) => f.label.startsWith("Top 10"));
    expect(top?.level).toBe("danger");
    expect(top?.detail).toContain("estimation");
  });

  it("n'affiche rien quand une donnée est inconnue", () => {
    const flags = riskFlags({ ...base, creatorPct: null, top10Pct: null, top10Source: null });
    expect(flags.some((f) => f.label.startsWith("Créateur"))).toBe(false);
    expect(flags.some((f) => f.label.startsWith("Top 10"))).toBe(false);
  });

  it("n'affiche aucun badge d'autorité non vérifié", () => {
    const labels = riskFlags({ ...base, mintRevoked: null, freezeRevoked: null }).map((f) => f.label);
    expect(labels).not.toContain("Mint immuable");
    expect(labels).not.toContain("Pas de gel possible");
  });

  it("alerte si le mint n'est pas révoqué", () => {
    expect(riskFlags({ ...base, mintRevoked: false })[0]).toMatchObject({ level: "danger", label: "Mint actif" });
  });
});
