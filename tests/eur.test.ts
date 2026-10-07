import { describe, expect, it } from "vitest";
import { formatEur } from "@/lib/eur";

describe("formatEur", () => {
  it("arrondit à l'euro au-dessus de 1 €", () => expect(formatEur(2.18, 107, false)).toBe("≈ 233 €"));
  it("garde les centimes sous 1 €", () => expect(formatEur(0.005, 107, false)).toBe("≈ 0,54 €"));
  it("signale les euros fictifs sur le devnet", () => expect(formatEur(1, 100, true)).toBe("≈ 100 € fictifs"));
  it("affiche 0 proprement", () => expect(formatEur(0, 107, false)).toBe("≈ 0 €"));
});
