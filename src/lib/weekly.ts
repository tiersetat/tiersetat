/** Le Mème de la semaine : semaines du lundi 0 h (heure de Paris) et classement (pur, testé). */

const TZ = "Europe/Paris";
/** Bonus par trader distinct (hors créateur), en SOL équivalents. */
export const TRADER_BONUS_SOL = 0.05;
/** Au-delà de cette part revendue par son créateur, un mème est hors concours. */
export const DUMP_LIMIT_PCT = 50;
export const WINNER_POINTS = 500;

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

export type WeekTrade = { mint: string; trader_wallet: string; sol_amount: number };
export type WeekToken = { mint: string; creator_wallet: string; creator_sold_pct: number | null };
export type WeekEntry = { mint: string; score: number; volumeSol: number; traders: number; disqualified: boolean };

/** Classement d'une semaine : volume et traders hors créateur ; les mèmes « revendus » sont hors concours. */
export function rankWeek(trades: WeekTrade[], tokens: WeekToken[]): WeekEntry[] {
  const byMint = new Map(tokens.map((t) => [t.mint, t]));
  const acc = new Map<string, { volume: number; traders: Set<string> }>();
  for (const t of trades) {
    const token = byMint.get(t.mint);
    if (!token || t.trader_wallet === token.creator_wallet) continue;
    const a = acc.get(t.mint) ?? { volume: 0, traders: new Set<string>() };
    a.volume += Number(t.sol_amount);
    a.traders.add(t.trader_wallet);
    acc.set(t.mint, a);
  }
  return [...acc.entries()]
    .map(([mint, a]) => {
      const sold = byMint.get(mint)?.creator_sold_pct ?? null;
      return {
        mint,
        volumeSol: a.volume,
        traders: a.traders.size,
        score: a.volume + TRADER_BONUS_SOL * a.traders.size,
        disqualified: sold !== null && sold >= DUMP_LIMIT_PCT,
      };
    })
    .sort((x, y) => Number(x.disqualified) - Number(y.disqualified) || y.score - x.score);
}

/** Le gagnant : le premier non disqualifié, s'il y a eu au moins un échange. */
export const winnerOf = (ranking: WeekEntry[]) => ranking.find((e) => !e.disqualified && e.score > 0) ?? null;
