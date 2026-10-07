/** Calcul du portefeuille (pur, testé) : valeur actuelle et gains/pertes d'après les trades indexés. */

export type Holding = {
  mint: string;
  name: string;
  ticker: string;
  image_url: string;
  /** Quantité détenue (tokens) */
  amount: number;
  /** Prix actuel d'un token, en SOL */
  priceSol: number;
};
export type TradeLite = { mint: string; side: "buy" | "sell"; sol_amount: number };

export type PortfolioLine = Holding & {
  valueSol: number;
  spentSol: number;
  receivedSol: number;
  /** Gain ou perte : valeur actuelle + SOL récupérés − SOL dépensés */
  pnlSol: number;
  /** En % du SOL dépensé, null si aucun achat indexé */
  pnlPct: number | null;
};

export function buildPortfolio(holdings: Holding[], trades: TradeLite[]) {
  const flows = new Map<string, { spent: number; received: number }>();
  for (const t of trades) {
    const f = flows.get(t.mint) ?? { spent: 0, received: 0 };
    if (t.side === "buy") f.spent += Number(t.sol_amount);
    else f.received += Number(t.sol_amount);
    flows.set(t.mint, f);
  }
  const lines: PortfolioLine[] = holdings
    .map((h) => {
      const f = flows.get(h.mint) ?? { spent: 0, received: 0 };
      const valueSol = h.amount * h.priceSol;
      const pnlSol = valueSol + f.received - f.spent;
      return { ...h, valueSol, spentSol: f.spent, receivedSol: f.received, pnlSol, pnlPct: f.spent > 0 ? (pnlSol / f.spent) * 100 : null };
    })
    .sort((a, b) => b.valueSol - a.valueSol);
  const total = lines.reduce(
    (acc, l) => ({ valueSol: acc.valueSol + l.valueSol, spentSol: acc.spentSol + l.spentSol, pnlSol: acc.pnlSol + l.pnlSol }),
    { valueSol: 0, spentSol: 0, pnlSol: 0 },
  );
  return { lines, total };
}
