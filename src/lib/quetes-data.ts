import "server-only";
import { creatorSoldByMint } from "@/lib/creator-trust-data";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { QuestStats } from "@/lib/quetes";

export type MyToken = { mint: string; name: string; ticker: string; image_url: string };

const EMPTY: QuestStats = { hasToken: false, descriptionLength: 0, hasX: false, announcements: 0, holders: 0, ageHours: 0, soldPct: null, curve: 0, migrated: false, referrals: 0 };

/** Les mèmes d'un créateur et l'état des quêtes pour l'un d'eux (le plus récent par défaut). */
export async function questData(wallet: string, mint: string | null): Promise<{ tokens: MyToken[]; mint: string | null; stats: QuestStats }> {
  const db = supabaseAdmin();
  const [{ data: tokens }, { count: referrals }] = await Promise.all([
    db
      .from("tokens")
      .select("mint, name, ticker, image_url, description, twitter_url, curve_progress, migrated, created_at")
      .eq("creator_wallet", wallet)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("profiles").select("wallet", { count: "exact", head: true }).eq("referred_by", wallet),
  ]);
  const list = tokens ?? [];
  const mine = list.map((t) => ({ mint: t.mint as string, name: t.name as string, ticker: t.ticker as string, image_url: t.image_url as string }));
  const t = list.find((x) => x.mint === mint) ?? list[0];
  if (!t) return { tokens: [], mint: null, stats: { ...EMPTY, referrals: referrals ?? 0 } };

  const [{ data: trades }, { count: announcements }, sold] = await Promise.all([
    db.from("trades").select("trader_wallet, side, token_amount").eq("mint", t.mint).limit(20_000),
    db.from("comments").select("id", { count: "exact", head: true }).eq("mint", t.mint).eq("author_wallet", wallet).eq("hidden", false),
    creatorSoldByMint([{ mint: t.mint, creator_wallet: wallet }]).catch(() => new Map<string, number | null>()),
  ]);
  // Détenteurs : solde net positif, le créateur ne compte jamais
  const bal = new Map<string, number>();
  for (const x of trades ?? []) {
    if (x.trader_wallet === wallet) continue;
    bal.set(x.trader_wallet, (bal.get(x.trader_wallet) ?? 0) + (x.side === "buy" ? 1 : -1) * Number(x.token_amount));
  }
  return {
    tokens: mine,
    mint: t.mint,
    stats: {
      hasToken: true,
      descriptionLength: (t.description ?? "").trim().length,
      hasX: Boolean(t.twitter_url),
      announcements: announcements ?? 0,
      holders: [...bal.values()].filter((v) => v > 0).length,
      ageHours: (Date.now() - Date.parse(t.created_at)) / 3_600_000,
      soldPct: sold.get(t.mint) ?? null,
      curve: Number(t.curve_progress),
      migrated: Boolean(t.migrated),
      referrals: referrals ?? 0,
    },
  };
}
