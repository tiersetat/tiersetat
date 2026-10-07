/** Récapitulatif d'une position (pur, testé) : d'après les trades indexés d'un wallet sur un token. */

export type PositionTrade = { side: "buy" | "sell"; sol_amount: number; token_amount: number; price_sol: number; block_time: string; signature: string };

export type Position = {
  trades: PositionTrade[];
  firstBuyAt: string | null;
  lastSellAt: string | null;
  boughtTokens: number;
  soldTokens: number;
  heldTokens: number;
  spentSol: number;
  receivedSol: number;
  /** Prix moyen d'achat / de vente d'un token, en SOL */
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  /** Valeur des tokens encore détenus au prix actuel */
  valueSol: number;
  /** Gain ou perte : SOL récupérés + valeur restante − SOL dépensés */
  pnlSol: number;
  pnlPct: number | null;
  /** Multiplicateur (récupéré + valeur) / dépensé, ex. 3.2 pour « x3,2 » */
  multiple: number | null;
  /** Position entièrement soldée */
  closed: boolean;
};

export function buildPosition(raw: PositionTrade[], currentPriceSol: number): Position {
  const trades = [...raw].sort((a, b) => a.block_time.localeCompare(b.block_time));
  let boughtTokens = 0, soldTokens = 0, spentSol = 0, receivedSol = 0;
  for (const t of trades) {
    if (t.side === "buy") {
      boughtTokens += Number(t.token_amount);
      spentSol += Number(t.sol_amount);
    } else {
      soldTokens += Number(t.token_amount);
      receivedSol += Number(t.sol_amount);
    }
  }
  // Les tokens peuvent venir d'ailleurs (transfert) : on ne descend jamais sous zéro
  const heldTokens = Math.max(0, boughtTokens - soldTokens);
  const valueSol = heldTokens * currentPriceSol;
  const pnlSol = receivedSol + valueSol - spentSol;
  return {
    trades,
    firstBuyAt: trades.find((t) => t.side === "buy")?.block_time ?? null,
    lastSellAt: trades.findLast((t) => t.side === "sell")?.block_time ?? null,
    boughtTokens,
    soldTokens,
    heldTokens,
    spentSol,
    receivedSol,
    avgBuyPrice: boughtTokens > 0 ? spentSol / boughtTokens : null,
    avgSellPrice: soldTokens > 0 ? receivedSol / soldTokens : null,
    valueSol,
    pnlSol,
    pnlPct: spentSol > 0 ? (pnlSol / spentSol) * 100 : null,
    multiple: spentSol > 0 ? (receivedSol + valueSol) / spentSol : null,
    closed: boughtTokens > 0 && heldTokens < boughtTokens * 1e-6,
  };
}

/** Durée lisible entre deux dates : « 3 j 4 h », « 2 h 15 min », « 45 min ». */
export function formatDuration(fromIso: string, toIso: string): string {
  const minutes = Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
  return `${Math.floor(hours / 24)} j ${hours % 24} h`;
}
