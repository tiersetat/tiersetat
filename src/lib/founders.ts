/** Les 100 Fondateurs : les premiers comptes à agir vraiment (créer ou échanger un mème). Calcul pur, testé. */

export const FOUNDER_SEATS = 100;

export type FirstAction = { wallet: string; at: string };

/** Numéro de fondateur (1 = le premier) par wallet, d'après la date de première action. */
export function computeFounders(actions: FirstAction[], seats = FOUNDER_SEATS): Map<string, number> {
  const first = new Map<string, number>();
  for (const a of actions) {
    const t = Date.parse(a.at);
    if (!Number.isFinite(t)) continue;
    const cur = first.get(a.wallet);
    if (cur === undefined || t < cur) first.set(a.wallet, t);
  }
  const ordered = [...first.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).slice(0, seats);
  return new Map(ordered.map(([wallet], i) => [wallet, i + 1]));
}
