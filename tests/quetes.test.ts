import { describe, expect, it } from "vitest";
import { questsOf, type QuestStats } from "@/lib/quetes";

const base: QuestStats = { hasToken: true, descriptionLength: 0, hasX: false, announcements: 0, holders: 0, ageHours: 1, soldPct: 0, curve: 0, migrated: false, referrals: 0 };

describe("quêtes du chapitre 2", () => {
  it("sans mème, la première quête est de frapper", () => {
    expect(questsOf({ ...base, hasToken: false }).next).toBe("frappe");
  });
  it("compte les détenteurs et les étapes", () => {
    const r = questsOf({ ...base, descriptionLength: 40, hasX: true, announcements: 2, holders: 12 });
    const done = new Set(r.list.filter((x) => x.state.done).map((x) => x.q.id));
    expect(done.has("cercle")).toBe(true);
    expect(done.has("course")).toBe(false);
    expect(r.next).toBe("parole");
  });
  it("revendre fait échouer « Tenir parole »", () => {
    const r = questsOf({ ...base, ageHours: 48, soldPct: 60 });
    expect(r.list.find((x) => x.q.id === "parole")?.state.done).toBe(false);
    expect(questsOf({ ...base, ageHours: 48, soldPct: 2 }).list.find((x) => x.q.id === "parole")?.state.done).toBe(true);
  });
  it("la Bastille valide aussi la mi-chemin", () => {
    const r = questsOf({ ...base, migrated: true, curve: 100 });
    expect(r.list.find((x) => x.q.id === "mi-chemin")?.state.done).toBe(true);
    expect(r.list.find((x) => x.q.id === "bastille")?.state.done).toBe(true);
  });
});
