import { describe, expect, it } from "vitest";
import { rangOf, rankCahiers, scoreCahier, type CahierStats } from "@/lib/cahiers";

const base: CahierStats = { wallet: "W", tokens_created: 0, volume_sol: 0, tokens_traded: 0, comments: 0, followers: 0, has_clan: false, creator_volume_sol: 0 };

describe("scoreCahier", () => {
  it("additionne les catégories", () => {
    const c = scoreCahier({ ...base, tokens_created: 2, volume_sol: 1.5, tokens_traded: 3, comments: 4, followers: 1, has_clan: true, creator_volume_sol: 2 });
    // 200 + 60 + 30 + 30 + 10 + 20 + 50
    expect(c.points).toBe(400);
    expect(c.rang).toBe("Citoyen");
  });

  it("plafonne chaque catégorie contre les abus", () => {
    const c = scoreCahier({ ...base, tokens_created: 1_000, volume_sol: 1e6, comments: 1e4 });
    expect(c.detail.find((d) => d.key === "frappe")?.points).toBe(2_000);
    expect(c.detail.find((d) => d.key === "echanges")?.points).toBe(2_000);
    expect(c.detail.find((d) => d.key === "parole")?.points).toBe(200);
  });

  it("accepte les nombres renvoyés en texte par Postgres", () => {
    expect(scoreCahier({ ...base, volume_sol: "2.5" as unknown as number }).points).toBe(50);
  });
});

describe("rangOf / rankCahiers", () => {
  it("attribue les rangs par seuil", () => {
    expect(rangOf(0)).toBe("Sujet");
    expect(rangOf(1_500)).toBe("Tribun");
    expect(rangOf(99_999)).toBe("Héros de la Bastille");
  });

  it("trie et exclut les comptes sans point", () => {
    const ranked = rankCahiers([{ ...base, wallet: "A", comments: 1 }, { ...base, wallet: "B" }, { ...base, wallet: "C", tokens_created: 1 }]);
    expect(ranked.map((c) => c.wallet)).toEqual(["C", "A"]);
  });
});

describe("invitations", () => {
  it("compte 50 points par invité actif, plafonnés", () => {
    expect(scoreCahier({ ...base, active_referrals: 3 }).points).toBe(150);
    expect(scoreCahier({ ...base, active_referrals: 1_000 }).detail.find((d) => d.key === "invitations")?.points).toBe(2_500);
  });
});
