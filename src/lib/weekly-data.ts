import "server-only";
import { creatorSoldByMint } from "@/lib/creator-trust-data";
import { memo } from "@/lib/memo";
import { supabasePublic } from "@/lib/supabase/public";
import { rankWeek, weekStart, winnerOf, type WeekEntry, type WeekTrade } from "@/lib/weekly";

export type WeekMeme = WeekEntry & { name: string; ticker: string; image_url: string; creator_wallet: string };
export type Week = { start: number; end: number; ranking: WeekMeme[]; winner: WeekMeme | null };

/** Semaine en cours sans aucun échange (repli si la base est indisponible). */
export function emptyWeek(): Week {
  return { start: weekStart(Date.now()), end: weekStart(Date.now(), -1), ranking: [], winner: null };
}

/** Une semaine du concours (0 = en cours, 1 = la précédente…) : les mèmes créés dans la semaine, cache 60 s. */
export function getWeek(weeksAgo = 0): Promise<Week> {
  return memo(`week:${weeksAgo}:${weekStart(Date.now(), weeksAgo)}`, 60_000, async () => {
    const start = weekStart(Date.now(), weeksAgo);
    const end = weekStart(Date.now(), weeksAgo - 1);
    const db = supabasePublic();
    const { data: tokens } = await db
      .from("tokens")
      .select("mint, name, ticker, image_url, creator_wallet, market_cap_sol")
      .eq("hidden", false)
      .gte("created_at", new Date(start).toISOString())
      .lt("created_at", new Date(end).toISOString())
      .limit(500)
      .returns<{ mint: string; name: string; ticker: string; image_url: string; creator_wallet: string; market_cap_sol: number | null }[]>();
    if (!tokens?.length) return { start, end, ranking: [], winner: null };

    const { data: trades } = await db
      .from("trades")
      .select("mint, trader_wallet, side, token_amount, price_sol, block_time")
      .in("mint", tokens.map((t) => t.mint))
      .lt("block_time", new Date(end).toISOString())
      .limit(20_000)
      .returns<WeekTrade[]>();
    const sold = await creatorSoldByMint(tokens).catch(() => new Map<string, number | null>());
    const info = new Map(tokens.map((t) => [t.mint, t]));
    const ranking = rankWeek(
      trades ?? [],
      // Semaine terminée : capitalisation au dernier échange de la semaine ; semaine en cours : celle d'aujourd'hui
      tokens.map((t) => ({ mint: t.mint, creator_wallet: t.creator_wallet, creator_sold_pct: sold.get(t.mint) ?? null, market_cap_sol: weeksAgo === 0 ? t.market_cap_sol : null })),
    ).map((e) => ({ ...e, ...info.get(e.mint)! }));
    return { start, end, ranking, winner: (winnerOf(ranking) as WeekMeme | null) ?? null };
  });
}

/** Gagnants des semaines passées, de la plus récente à la plus ancienne. */
export async function getPastWinners(weeks = 12): Promise<(WeekMeme & { start: number })[]> {
  const all = await Promise.all(Array.from({ length: weeks }, (_, i) => getWeek(i + 1).catch(() => null)));
  return all.flatMap((w) => (w?.winner ? [{ ...w.winner, start: w.start }] : []));
}

/** Nombre de victoires par créateur (pour les points des Cahiers). */
export async function winsByCreator(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const w of await getPastWinners()) out.set(w.creator_wallet, (out.get(w.creator_wallet) ?? 0) + 1);
  return out;
}
