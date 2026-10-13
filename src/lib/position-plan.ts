/**
 * Outil « position » du graphique, comme dans TradingView : entrée, stop, objectif (et objectif partiel),
 * avec risque, gain visé, ratio et gain ou perte en cours. Pur, testé ; aucun ordre n'est passé.
 */
export type Side = "long" | "short";
export type Plan = { side: Side; entry: number; stop: number; target: number; partial?: number | null };
export type PlanCheck = { ok: true; riskPct: number; rewardPct: number; ratio: number } | { ok: false; reason: string };

export function checkPlan(p: Plan): PlanCheck {
  const { side, entry, stop, target, partial } = p;
  if (![entry, stop, target].every((v) => Number.isFinite(v) && v > 0)) return { ok: false, reason: "Indique l'entrée, le stop et l'objectif." };
  if (side === "short" && !(stop > entry && entry > target)) return { ok: false, reason: "Short : le stop doit être au-dessus de l'entrée, et l'objectif en dessous." };
  if (side === "long" && !(stop < entry && entry < target)) return { ok: false, reason: "Long : le stop doit être sous l'entrée, et l'objectif au-dessus." };
  if (partial != null && Number.isFinite(partial) && !(side === "short" ? partial < entry && partial > target : partial > entry && partial < target)) {
    return { ok: false, reason: "L'objectif partiel doit être entre l'entrée et l'objectif." };
  }
  const riskPct = (Math.abs(stop - entry) / entry) * 100;
  const rewardPct = (Math.abs(target - entry) / entry) * 100;
  return { ok: true, riskPct, rewardPct, ratio: rewardPct / riskPct };
}

/** Gain (positif) ou perte (négative) en % du prix d'entrée, hors levier et hors frais. */
export function pnlPct(p: Plan, price: number): number {
  return ((p.side === "long" ? price - p.entry : p.entry - price) / p.entry) * 100;
}

/** Valeur par défaut d'un nouveau plan à partir du prix actuel (stop à 3 %, objectif à 4,5 %). */
export function defaultPlan(side: Side, price: number): Plan {
  const s = side === "long" ? 1 : -1;
  return { side, entry: price, stop: price * (1 - 0.03 * s), target: price * (1 + 0.045 * s), partial: null };
}
