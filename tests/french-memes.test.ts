import { describe, expect, it } from "vitest";
import { exclusionReason, looksFrench, passesChecks } from "@/lib/french-memes";

describe("Mèmes français", () => {
  it("reconnaît un thème français", () => {
    expect(looksFrench({ name: "The Baguette Fund", symbol: "BAG" })).toBe(true);
    expect(looksFrench({ name: "Dog", symbol: "DOG", description: "Le chien qui est le plus fort de tous, pour nous et pour vous dans la rue" })).toBe(true);
    expect(looksFrench({ name: "Dog", symbol: "DOG", links: ["https://www.lemonde.fr/article"] })).toBe(true);
    expect(looksFrench({ name: "Moon Dog", symbol: "MDOG", description: "The best dog on Solana" })).toBe(false);
  });
  it("écarte la politique, les insultes et les drames", () => {
    expect(exclusionReason({ name: "Pepe Le Pen", symbol: "Pepe" })).toBe("politique");
    expect(exclusionReason({ name: "Mélenchon coin", symbol: "MEL" })).toBe("politique");
    expect(exclusionReason({ name: "The Baguette Nigga", symbol: "BN" })).toBe("insulte");
    expect(exclusionReason({ name: "French Riots", symbol: "blocus" })).toBe("violence");
    expect(exclusionReason({ name: "Paris On Fire", symbol: "PARIS" })).toBe("violence");
    expect(exclusionReason({ name: "Croissant", symbol: "CRS" })).toBeNull();
  });
  it("écarte les lanceurs en série et les tokens sans communauté", () => {
    expect(passesChecks({ holders: 500, devMints: 3 })).toBe(true);
    expect(passesChecks({ holders: 500, devMints: 4913 })).toBe(false);
    expect(passesChecks({ holders: 40, devMints: 1 })).toBe(false);
    expect(passesChecks({ holders: 500, devMints: null })).toBe(false);
  });
});
