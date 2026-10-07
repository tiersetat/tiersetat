/**
 * Compteur de la dette publique (estimation) : dernier chiffre INSEE + rythme observé.
 * À mettre à jour à chaque publication trimestrielle de l'INSEE.
 */
export const DETTE = {
  /** Dette publique au sens de Maastricht au 30 juin 2026 (INSEE, publication de septembre 2026) */
  baseEur: 3_595.5e9,
  baseAt: "2026-06-30T23:59:59+02:00",
  ratioPib: 119,
  /** Hausse observée au 1er semestre 2026 : +75,6 Md€ (T1) et +59,6 Md€ (T2) sur 181 jours */
  eurPerSecond: (75.6e9 + 59.6e9) / (181 * 86_400),
  /** Population au 1er janvier 2026 (INSEE, estimation) */
  population: 68_600_000,
  source: "INSEE, dette trimestrielle de Maastricht des administrations publiques, T2 2026",
} as const;

/** Dette estimée à un instant donné (en euros). */
export function detteAt(ms: number): number {
  return DETTE.baseEur + ((ms - Date.parse(DETTE.baseAt)) / 1000) * DETTE.eurPerSecond;
}
