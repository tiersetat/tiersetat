import { describe, expect, it } from "vitest";
import { retailLeverage } from "@/lib/hyperliquid";

describe("levier pour les particuliers", () => {
  it("ne dépasse jamais ×5, ×2 sur les indices crypto", () => {
    expect(retailLeverage("TSLA", 20)).toBe(5);
    expect(retailLeverage("GOLD", 50)).toBe(5);
    expect(retailLeverage("TOTAL2", 10)).toBe(2);
    expect(retailLeverage("SPCX", 3)).toBe(3);
  });
});
