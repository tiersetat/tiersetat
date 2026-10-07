import { describe, expect, it } from "vitest";
import { moderate, normalizeText } from "@/lib/moderation";

const BLOCKED = ["bougnoule", "sale juif", "heil hitler", "pede"];

describe("normalizeText", () => {
  it("retire accents, majuscules, ponctuation et décode le leet", () => {
    expect(normalizeText("Égalité, LIBERTÉ !")).toBe("egalite liberte");
    expect(normalizeText("B0UGN0UL3")).toBe("bougnoule");
  });
});

describe("moderate", () => {
  it("laisse passer la satire normale", () => {
    expect(moderate(["Le Grand Débat", "DEBAT", "Mème sur la réforme des retraites"], BLOCKED).ok).toBe(true);
  });

  it("bloque un mot interdit, même déguisé", () => {
    expect(moderate(["B.0.u.g.n.o.u.l.e coin"], BLOCKED).ok).toBe(false);
    expect(moderate(["Sale   Juif"], BLOCKED).ok).toBe(false);
    expect(moderate(["HEIL-HITLER"], BLOCKED).ok).toBe(false);
  });

  it("évite les faux positifs sur les mots courts", () => {
    expect(moderate(["Le pédestre du dimanche"], BLOCKED).ok).toBe(true);
  });

  it("interdit les faux tokens « officiels »", () => {
    const r = moderate(["Macron Coin OFFICIEL"], BLOCKED);
    expect(r.ok).toBe(false);
    expect(moderate(["Token vérifié du président"], BLOCKED).ok).toBe(false);
    expect(moderate(["The official meme"], BLOCKED).ok).toBe(false);
  });
});
