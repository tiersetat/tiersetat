import { describe, expect, it } from "vitest";
import { age, alertes, isSolanaAddress, normalizeTicker, pct, usd, type RadarStats } from "@/lib/radar-utils";

const now = Date.parse("2026-10-07T12:00:00Z");
const base: RadarStats = { priceUsd: 0.001, mcapUsd: 1e6, liquidityUsd: 2e5, volume24Usd: 5e5, change: { m5: 0, h1: 0, h24: 5 }, buys24: 100, sells24: 90, createdAt: now - 30 * 86_400_000 };

describe("alertes", () => {
  it("rien à signaler sur un token sain", () => expect(alertes(base, now)).toEqual([]));
  it("liquidité faible, token neuf, chute", () => {
    const a = alertes({ ...base, liquidityUsd: 5_000, createdAt: now - 2 * 3_600_000, change: { m5: 0, h1: 0, h24: -70 } }, now).map((x) => x.texte);
    expect(a).toContain("Liquidité très faible : difficile de revendre");
    expect(a).toContain("Token créé il y a 2 h");
    expect(a).toContain("Chute de 70 % en 24 h");
    expect(a).toContain("Capitalisation très supérieure à la liquidité");
  });
  it("pression vendeuse", () => {
    expect(alertes({ ...base, buys24: 100, sells24: 300 }, now).map((x) => x.texte)).toContain("Beaucoup plus de ventes que d'achats sur 24 h");
  });
});

describe("formats", () => {
  it("usd", () => {
    expect(usd(1_234_567)).toBe("1,23 M $");
    expect(usd(12_300_000_000)).toBe("12,3 Md $");
    expect(usd(0.000003674)).toBe("0,00000367 $");
    expect(usd(null)).toBe("—");
  });
  it("pct et âge", () => {
    expect(pct(1126.6)).toMatch(/^\+1\s127 %$/u);
    expect(pct(-4.64)).toBe("-4,6 %");
    expect(age(now - 90 * 60_000, now)).toBe("1 h");
    expect(age(now - 5 * 86_400_000, now)).toBe("5 j");
  });
  it("adresse et ticker", () => {
    expect(isSolanaAddress("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")).toBe(true);
    expect(isSolanaAddress("$INU")).toBe(false);
    expect(normalizeTicker(" $inu ")).toBe("INU");
  });
});

describe("gros tokens", () => {
  it("pas d'alerte de ratio pour une très grosse capitalisation", () => {
    expect(alertes({ ...base, mcapUsd: 323e6, liquidityUsd: 421e3 }, now)).toEqual([]);
  });
});
