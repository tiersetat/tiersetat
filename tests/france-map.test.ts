import { describe, expect, it } from "vitest";
import { CENTER, CLAN_CITIES, nightLevel, pointForClan } from "@/lib/france-map";

describe("carte « La France qui trade »", () => {
  it("place l'onde sur la ville du clan, sinon au centre", () => {
    expect(pointForClan("ile-de-france").name).toBe("Paris");
    expect(pointForClan(null)).toBe(CENTER);
    expect(pointForClan("outre-mer")).toBe(CENTER);
  });
  it("garde chaque ville dans l'image", () => {
    for (const c of Object.values(CLAN_CITIES)) for (const v of [c.m, c.d]) for (const n of v) expect(n).toBeGreaterThanOrEqual(0), expect(n).toBeLessThanOrEqual(100);
  });
  it("est pleine la nuit et plus calme le jour", () => {
    expect(nightLevel(23)).toBe(1);
    expect(nightLevel(3)).toBe(1);
    expect(nightLevel(13)).toBe(0.55);
    expect(nightLevel(6.5)).toBeCloseTo(0.775);
  });
});
