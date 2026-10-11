import { describe, expect, it } from "vitest";
import { CENTER, CLAN_CITIES, MAP_VIEWS, nightLevel, pointForClan, pulsePoint, viewLights } from "@/lib/france-map";

describe("carte « Le monde qui trade »", () => {
  it("vue France : l'onde part de la ville du clan, sinon du centre", () => {
    expect(pointForClan("ile-de-france").name).toBe("Paris");
    expect(pointForClan(null)).toBe(CENTER);
    expect(pulsePoint("france", "m", { country: "FR", clan: "occitanie" })).toEqual(CLAN_CITIES.occitanie.m);
    expect(pulsePoint("france", "m", { country: "FR", clan: null })).toEqual(CENTER.m);
  });
  it("vue France : un trader d'un autre pays ne fait pas d'onde", () => {
    expect(pulsePoint("france", "d", { country: "US", clan: null })).toBeNull();
  });
  it("vues du monde : l'onde part de la capitale du pays", () => {
    expect(pulsePoint("monde", "d", { country: "CN" })).not.toBeNull();
    expect(pulsePoint("usa", "d", { country: "US" })).not.toBeNull();
    expect(pulsePoint("chine", "m", { country: "FR" })).toBeNull();
    // Sans pays mais avec un clan régional : la personne est en France
    expect(pulsePoint("europe", "m", { country: null, clan: "bretagne" })).not.toBeNull();
    expect(pulsePoint("monde", "m", { country: null, clan: null })).toBeNull();
  });
  it("chaque vue a des lumières dans l'image", () => {
    for (const v of MAP_VIEWS)
      for (const variant of ["m", "d"] as const)
        for (const [x, y] of viewLights(v.key, variant)) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(100);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(100);
        }
  });
  it("est pleine la nuit et plus calme le jour", () => {
    expect(nightLevel(23)).toBe(1);
    expect(nightLevel(13)).toBe(0.55);
    expect(nightLevel(6.5)).toBeCloseTo(0.775);
  });
});
