import { describe, expect, it } from "vitest";
import { canChangeClan, nextChangeDate } from "@/lib/clans";

describe("changement de clan", () => {
  const now = Date.parse("2026-10-14T12:00:00Z");
  it("libre si jamais rejoint", () => expect(canChangeClan(null, now)).toBe(true));
  it("bloqué pendant 7 jours", () => expect(canChangeClan("2026-10-10T12:00:00Z", now)).toBe(false));
  it("autorisé après 7 jours", () => expect(canChangeClan("2026-10-07T12:00:00Z", now)).toBe(true));
  it("calcule la date du prochain changement", () =>
    expect(nextChangeDate("2026-10-10T12:00:00Z").toISOString()).toBe("2026-10-17T12:00:00.000Z"));
});
