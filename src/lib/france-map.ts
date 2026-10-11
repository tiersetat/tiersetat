/**
 * Points de la carte « France la nuit » (photo NASA, domaine public), en % de l'image :
 * `m` = image téléphone (1200 × 2133), `d` = image ordinateur (2560 × 1600).
 * Une ville par clan régional : c'est de là que part l'onde quand un membre du clan achète.
 */
export type MapPoint = { name: string; m: [number, number]; d: [number, number] };

export const MAP_RATIO = { m: 1200 / 2133, d: 2560 / 1600 } as const;

export const CLAN_CITIES: Record<string, MapPoint> = {
  "ile-de-france": { name: "Paris", m: [49.57, 40.61], d: [64.56, 23.17] },
  "auvergne-rhone-alpes": { name: "Lyon", m: [64.23, 58.72], d: [74.18, 56.98] },
  "provence-alpes-cote-d-azur": { name: "Marseille", m: [66.9, 72.26], d: [75.93, 82.25] },
  occitanie: { name: "Toulouse", m: [38.1, 69.34], d: [57.03, 76.79] },
  "nouvelle-aquitaine": { name: "Bordeaux", m: [25.77, 61.65], d: [48.94, 62.44] },
  bretagne: { name: "Rennes", m: [22.63, 43.08], d: [46.88, 27.79] },
  normandie: { name: "Rouen", m: [36.3, 36.37], d: [55.85, 15.26] },
  "hauts-de-france": { name: "Lille", m: [56.43, 30.75], d: [69.07, 4.76] },
  "grand-est": { name: "Strasbourg", m: [84.63, 43.27], d: [87.57, 28.14] },
  "bourgogne-franche-comte": { name: "Dijon", m: [66.3, 49.99], d: [75.54, 40.67] },
  "centre-val-de-loire": { name: "Orléans", m: [45.83, 45.79], d: [62.11, 32.83] },
  "pays-de-la-loire": { name: "Nantes", m: [22.17, 48.07], d: [46.58, 37.1] },
  corse: { name: "Ajaccio", m: [91.17, 80.22], d: [91.86, 97.09] },
};

/** Sans clan (ou outre-mer) : l'onde part du centre de la France. */
export const CENTER: MapPoint = { name: "France", m: [48.93, 53.08], d: [64.14, 46.44] };

export function pointForClan(clan: string | null | undefined): MapPoint {
  return (clan && CLAN_CITIES[clan]) || CENTER;
}

/**
 * Luminosité de la carte selon l'heure à Paris : pleine la nuit (20 h – 6 h), plus calme en journée,
 * avec une transition d'une heure au lever et au coucher.
 */
export function nightLevel(hourParis: number): number {
  const h = ((hourParis % 24) + 24) % 24;
  if (h >= 20 || h < 6) return 1;
  if (h >= 7 && h < 19) return 0.55;
  if (h >= 6 && h < 7) return 1 - 0.45 * (h - 6);
  return 0.55 + 0.45 * (h - 19);
}
