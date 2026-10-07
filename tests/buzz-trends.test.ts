import { describe, expect, it } from "vitest";
import { computeTrends, itemHeat, keywords } from "@/lib/buzz-trends";

describe("keywords", () => {
  it("retire mots vides, élisions et accents dans la clé", () => {
    expect(keywords("L'Assemblée vote le budget avec Lecornu").map((k) => k.key)).toEqual(["assemblee", "vote", "budget", "lecornu"]);
  });
});

describe("computeTrends", () => {
  const items = [
    { source: "Le Monde", title: "Lecornu présente le budget" },
    { source: "franceinfo", title: "Budget : Lecornu sous pression" },
    { source: "BFMTV", title: "Le budget de Lecornu contesté" },
    { source: "20 Minutes", title: "Lecornu à l'Assemblée" },
    { source: "r/france", title: "Un chat élu maire" },
    { source: "Le Monde", title: "Lecornu encore" },
  ];
  const trends = computeTrends(items);

  it("classe par sources distinctes et ignore les sujets d'une seule source", () => {
    expect(trends[0]).toMatchObject({ key: "lecornu", label: "Lecornu", sources: 4, articles: 5, heat: "brulant" });
    expect(trends[1]).toMatchObject({ key: "budget", sources: 3, heat: "chaud" });
    expect(trends.find((t) => t.key === "chat")).toBeUndefined();
  });

  it("donne à un article la chaleur de son sujet le plus repris", () => {
    expect(itemHeat("Budget voté", trends)?.key).toBe("budget");
    expect(itemHeat("Un chat élu maire", trends)).toBeNull();
  });
});
