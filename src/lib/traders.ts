import { buildPosition, type Position, type PositionTrade } from "@/lib/position";

/** Une ligne « trader » d'un token : sa position, son gain ou sa perte, son prix d'entrée moyen. */
export type TraderPosition = Position & {
  wallet: string;
  /** Capitalisation moyenne à l'entrée (en SOL), comme « Moy. entrée » des applis de trading */
  avgEntryMcapSol: number | null;
  /** Durée de détention en millisecondes (premier achat → maintenant, ou → dernière vente si soldée) */
  holdMs: number | null;
};

export const TOTAL_SUPPLY = 1_000_000_000;

/** Regroupe les échanges d'un token par wallet et calcule chaque position au prix actuel (pur, testé). */
export function aggregateTraders(trades: (PositionTrade & { trader_wallet: string })[], currentPriceSol: number, now = Date.now()): TraderPosition[] {
  const byWallet = new Map<string, PositionTrade[]>();
  for (const t of trades) {
    const list = byWallet.get(t.trader_wallet) ?? [];
    list.push(t);
    byWallet.set(t.trader_wallet, list);
  }
  return [...byWallet.entries()]
    .map(([wallet, list]) => {
      const p = buildPosition(list, currentPriceSol);
      const end = p.closed && p.lastSellAt ? Date.parse(p.lastSellAt) : now;
      return {
        ...p,
        wallet,
        avgEntryMcapSol: p.avgBuyPrice === null ? null : p.avgBuyPrice * TOTAL_SUPPLY,
        holdMs: p.firstBuyAt ? Math.max(0, end - Date.parse(p.firstBuyAt)) : null,
      };
    })
    .filter((p) => p.spentSol > 0)
    .sort((a, b) => b.valueSol - a.valueSol || b.pnlSol - a.pnlSol);
}

/** « 5 h 18 min », « 2 j 20 h », « 11 min » */
export function holdLabel(ms: number | null): string {
  if (ms === null) return "—";
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} j ${h % 24} h`;
}
