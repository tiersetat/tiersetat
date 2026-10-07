/**
 * Accès par pays (pur, testé). Bloque les pays et régions sous sanctions internationales
 * (ONU, UE, États-Unis, Royaume-Uni) ; d'autres pays peuvent être ajoutés par configuration
 * (GEO_BLOCKED_EXTRA="BS,FR") selon l'avis juridique, sans modifier le code.
 */

/** Codes pays ISO 3166-1 alpha-2. */
// Aligné sur la liste observée chez une plateforme comparable ; Syrie, Russie et Biélorussie : à trancher avec l'avocat (GEO_BLOCKED_EXTRA).
export const SANCTIONED_COUNTRIES = ["CU", "IR", "KP", "MM", "VE", "LY", "SD", "YE", "CD"] as const;

/** Régions occupées d'Ukraine (ISO 3166-2 : Crimée, Sébastopol, Donetsk, Louhansk). */
export const SANCTIONED_UA_REGIONS = ["43", "40", "14", "09"] as const;

export function parseExtra(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
}

export function isGeoBlocked(country: string | null, region: string | null, extra: string[] = []): boolean {
  if (!country) return false; // pays inconnu (développement local, réseau privé) : pas de blocage
  const c = country.toUpperCase();
  if ((SANCTIONED_COUNTRIES as readonly string[]).includes(c) || extra.includes(c)) return true;
  if (c === "UA" && region) {
    const r = region.toUpperCase().replace(/^UA-/, "");
    return (SANCTIONED_UA_REGIONS as readonly string[]).includes(r);
  }
  return false;
}
