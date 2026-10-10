import { describe, expect, it } from "vitest";
import { editionLine, editionNumber, memeHeadline, moverHeadline, topicHeadline } from "@/lib/gazette-text";

describe("Gazette", () => {
  it("numérote les éditions depuis le premier jour de Tiers-État", () => {
    expect(editionNumber(Date.UTC(2026, 9, 6, 12))).toBe(1);
    expect(editionNumber(Date.UTC(2026, 9, 10, 12))).toBe(5);
  });

  it("date l'édition à l'heure de Paris", () => {
    expect(editionLine(Date.UTC(2026, 9, 10, 12, 32))).toBe("Samedi 10 octobre 2026 · 14 h 32");
  });

  it("titre un mème selon son avancée vers la Bastille", () => {
    expect(memeHeadline({ ticker: "BAGUETTE", progress: 100, migrated: true, volumeSol: 5, trades: 50 }).title).toBe("$BAGUETTE a pris la Bastille");
    expect(memeHeadline({ ticker: "BAGUETTE", progress: 85, migrated: false, volumeSol: 5, trades: 50 }).title).toBe("$BAGUETTE aux portes de la Bastille");
    expect(memeHeadline({ ticker: "BAGUETTE", progress: 10, migrated: false, volumeSol: 0, trades: 0 }).title).toBe("$BAGUETTE vient d'être frappé");
  });

  it("titre un token selon sa variation", () => {
    expect(moverHeadline("WIF", 184.04).title).toBe("$WIF s'envole de 184 %");
    expect(moverHeadline("ALTAI", 31325).title).toBe("$ALTAI explose de 31\u202f325 %");
    expect(moverHeadline("$BONK", -62).title).toBe("$BONK s'effondre de 62 %");
  });

  it("titre un sujet d'actualité", () => {
    expect(topicHeadline("grève", 7).title).toBe("« Grève » fait parler 7 médias");
  });
});
