/** Le Mème de la semaine : semaines du lundi 0 h (heure de Paris) et classement (pur, testé). */

const TZ = "Europe/Paris";
/** Il faut au moins ce nombre de vrais détenteurs (hors créateur) pour pouvoir gagner. */
export const MIN_HOLDERS = 20;
/** Au-delà de cette part revendue par son créateur, un mème est hors concours. */
export const DUMP_LIMIT_PCT = 50;
export const WINNER_POINTS = 500;
/** Nombre de tokens d'un mème (capitalisation = prix × offre). */
export const TOTAL_SUPPLY = 1_000_000_000;

/** Décalage de Paris par rapport à UTC (ms) à un instant donné. */
function parisOffset(ms: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(ms))
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** Début (lundi 0 h, heure de Paris) de la semaine contenant `ms`, décalée de `weeksAgo` semaines. */
export function weekStart(ms: number, weeksAgo = 0): number {
  const local = new Date(ms + parisOffset(ms));
  const daysFromMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysFromMonday - 7 * weeksAgo);
  return mondayLocal - parisOffset(mondayLocal);
}

export type WeekTrade = { mint: string; trader_wallet: string; side: "buy" | "sell"; token_amount: number; price_sol: number; block_time: string };
export type WeekToken = { mint: string; creator_wallet: string; creator_sold_pct: number | null; market_cap_sol?: number | null };
export type WeekEntry = { mint: string; marketCapSol: number; holders: number; eligible: boolean; disqualified: boolean };

/**
 * Le Mème de la semaine, classé par capitalisation. Concourent les mèmes créés dans la semaine.
 * Capitalisation = dernier prix échangé avant la fin de la semaine × offre (à défaut, celle connue du mème).
 * Pour gagner : au moins MIN_HOLDERS vrais détenteurs (le créateur ne compte pas), et ne pas avoir revendu
 * DUMP_LIMIT_PCT % ou plus de ses tokens (mème « revendu » = hors concours).
 */
export function rankWeek(trades: WeekTrade[], tokens: WeekToken[]): WeekEntry[] {
  const byMint = new Map(tokens.map((t) => [t.mint, t]));
  const last = new Map<string, { at: number; price: number }>();
  const balances = new Map<string, Map<string, number>>();
  for (const t of trades) {
    const token = byMint.get(t.mint);
    if (!token) continue;
    const at = Date.parse(t.block_time);
    const prev = last.get(t.mint);
    if (!prev || at >= prev.at) last.set(t.mint, { at, price: Number(t.price_sol) });
    if (t.trader_wallet === token.creator_wallet) continue;
    const b = balances.get(t.mint) ?? new Map<string, number>();
    b.set(t.trader_wallet, (b.get(t.trader_wallet) ?? 0) + (t.side === "buy" ? 1 : -1) * Number(t.token_amount));
    balances.set(t.mint, b);
  }
  return tokens
    .map((token) => {
      const price = last.get(token.mint)?.price;
      const marketCapSol = price !== undefined ? price * TOTAL_SUPPLY : Number(token.market_cap_sol ?? 0);
      const holders = [...(balances.get(token.mint)?.values() ?? [])].filter((v) => v > 0).length;
      const disqualified = token.creator_sold_pct !== null && token.creator_sold_pct >= DUMP_LIMIT_PCT;
      return { mint: token.mint, marketCapSol, holders, disqualified, eligible: !disqualified && holders >= MIN_HOLDERS };
    })
    .sort((x, y) => Number(y.eligible) - Number(x.eligible) || Number(x.disqualified) - Number(y.disqualified) || y.marketCapSol - x.marketCapSol);
}

/** Le gagnant : la plus grosse capitalisation parmi les mèmes qui remplissent les conditions. */
export const winnerOf = (ranking: WeekEntry[]) => ranking.find((e) => e.eligible) ?? null;
