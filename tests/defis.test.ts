import { describe, expect, it } from "vitest";
import { checkDefi, checkEntryUrl } from "@/lib/defis";

describe("défis", () => {
  it("accepte les défis créatifs", () => {
    expect(checkDefi("La meilleure vidéo $DETTE", "Fais une vidéo de 15 secondes qui explique la dette en mème, publie-la sur TikTok avec #DETTE").ok).toBe(true);
    expect(checkDefi("Photo du t-shirt", "Prends une photo avec le t-shirt $DETTE devant un monument connu").ok).toBe(true);
  });
  it("refuse les défis dangereux, illégaux ou avec promesse de gains", () => {
    expect(checkDefi("Défi extrême", "Monte sur le toit d'un immeuble avec le t-shirt").ok).toBe(false);
    expect(checkDefi("Street art", "Fais un graffiti $DETTE sur un mur de la ville").ok).toBe(false);
    expect(checkDefi("Défi alcool", "Bois une bouteille d'alcool en direct").ok).toBe(false);
    expect(checkDefi("Promo", "Poste que $DETTE va faire x100 garanti").ok).toBe(false);
  });
  it("n'accepte que des liens de réseaux connus", () => {
    expect(checkEntryUrl("https://x.com/user/status/123").ok).toBe(true);
    expect(checkEntryUrl("https://www.tiktok.com/@a/video/1").ok).toBe(true);
    expect(checkEntryUrl("https://evil.example/x").ok).toBe(false);
  });
});
