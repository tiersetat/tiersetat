import { describe, expect, it } from "vitest";
import { isGeoBlocked, parseExtra } from "@/lib/geo";

describe("isGeoBlocked", () => {
  it("bloque les pays sous sanctions", () => {
    expect(isGeoBlocked("IR", null)).toBe(true);
    expect(isGeoBlocked("kp", null)).toBe(true);
  });
  it("laisse passer les autres et les pays inconnus", () => {
    expect(isGeoBlocked("FR", null)).toBe(false);
    expect(isGeoBlocked("BS", null)).toBe(false);
    expect(isGeoBlocked(null, null)).toBe(false);
  });
  it("bloque uniquement les régions occupées d'Ukraine", () => {
    expect(isGeoBlocked("UA", "43")).toBe(true);
    expect(isGeoBlocked("UA", "UA-14")).toBe(true);
    expect(isGeoBlocked("UA", "30")).toBe(false);
  });
  it("pays supplémentaires par configuration", () => {
    expect(parseExtra(" bs, FR ,xyz")).toEqual(["BS", "FR"]);
    expect(isGeoBlocked("FR", null, parseExtra("FR"))).toBe(true);
  });
});
