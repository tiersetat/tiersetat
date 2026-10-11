/**
 * Historique de la valeur du portefeuille (pur, testé) :
 * - vrai utilisateur : relevés de son solde enregistrés sur l'appareil à chaque visite ;
 * - mode démo (vidéos) : une progression de démonstration, jamais montrée aux vrais utilisateurs.
 */
export type Point = { t: number; v: number };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Paliers de démonstration (en dollars) et leur ancienneté. */
const DEMO_STEPS: [number, number][] = [
  [30 * DAY, 0],
  [26 * DAY, 13_922.23],
  [21 * DAY, 39_002.29],
  [15 * DAY, 77_839.11],
  [8 * DAY, 124_372.89],
  [4 * DAY, 267_292.56],
  [26 * HOUR, 310_323.52],
  [3 * HOUR, 389_510.4],
  [0, 397_672.58],
];

/** Petit bruit déterministe pour que la courbe monte et descend comme un vrai cours. */
function noise(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

export function demoHistory(now: number): Point[] {
  const pts: Point[] = [];
  let k = 0;
  for (let s = 0; s < DEMO_STEPS.length - 1; s++) {
    const [ageA, va] = DEMO_STEPS[s];
    const [ageB, vb] = DEMO_STEPS[s + 1];
    const steps = Math.max(5, Math.min(18, Math.round((ageA - ageB) / (8 * HOUR))));
    for (let j = 0; j < steps; j++) {
      const f = j / steps;
      const base = va + (vb - va) * f;
      const wiggle = j === 0 ? 0 : noise(k++) * Math.max(1500, Math.abs(vb - va) * 0.55);
      pts.push({ t: now - ageA + (ageA - ageB) * f, v: Math.max(0, base + wiggle) });
    }
  }
  pts.push({ t: now, v: DEMO_STEPS[DEMO_STEPS.length - 1][1] });
  return pts;
}

export const DEMO_TOTAL_USD = 397_672.58;

/** Valeur à un instant donné (dernier point connu à cette date, sinon le premier). */
export function valueAt(points: Point[], t: number): number | null {
  if (!points.length) return null;
  let v = points[0].v;
  for (const p of points) {
    if (p.t <= t) v = p.v;
    else break;
  }
  return v;
}

export type Window = "1h" | "24h" | "7j" | "total";
export const WINDOWS: { key: Window; label: string; ms: number | null }[] = [
  { key: "1h", label: "1 h", ms: HOUR },
  { key: "24h", label: "24 h", ms: DAY },
  { key: "7j", label: "7 j", ms: 7 * DAY },
  { key: "total", label: "Total", ms: null },
];

/** Gain (en $ et en %) sur une fenêtre, par rapport à la valeur actuelle. */
export function gainOver(points: Point[], w: Window, now: number): { usd: number; pct: number | null } | null {
  if (points.length < 2) return null;
  const cur = points[points.length - 1].v;
  const ms = WINDOWS.find((x) => x.key === w)!.ms;
  const start = ms === null ? points[0].v : valueAt(points, now - ms) ?? points[0].v;
  return { usd: cur - start, pct: start > 0 ? ((cur - start) / start) * 100 : null };
}

/** Points d'une fenêtre (pour la courbe). */
export function windowPoints(points: Point[], w: Window, now: number): Point[] {
  const ms = WINDOWS.find((x) => x.key === w)!.ms;
  if (ms === null) return points;
  const from = now - ms;
  const inside = points.filter((p) => p.t >= from);
  const before = valueAt(points, from);
  return before === null ? inside : [{ t: from, v: before }, ...inside];
}

/** Relevés réels : ajoute la valeur actuelle (au plus un relevé toutes les 5 minutes, 2 000 max). */
export function addSnapshot(points: Point[], v: number, now: number): Point[] {
  const last = points[points.length - 1];
  if (last && now - last.t < 5 * 60_000) return [...points.slice(0, -1), { t: now, v }];
  return [...points, { t: now, v }].slice(-2000);
}
