import "server-only";
import { supabasePublic } from "@/lib/supabase/public";
import type { Clan } from "@/lib/clans";

export type RankedProfile = { wallet: string; pseudo: string | null; avatar_url: string | null; clan: Clan | null };
export type CreatorRow = RankedProfile & { volume_sol: number; tokens_launched: number; trades_count: number };
export type TraderRow = RankedProfile & { volume_sol: number; trades_count: number; net_sol: number };
export type ClanRow = Clan & { members: number; volume_sol: number; tokens_launched: number };

const LIMIT = 20;

/** Profils (pseudo, avatar, clan) des comptes classés. */
async function profilesOf(wallets: string[]): Promise<Map<string, RankedProfile>> {
  if (wallets.length === 0) return new Map();
  const db = supabasePublic();
  const [{ data: profiles }, { data: clans }] = await Promise.all([
    db.from("profiles").select("wallet, pseudo, avatar_url, clan").in("wallet", wallets),
    db.from("clans").select("slug, name, hue"),
  ]);
  const clanBySlug = new Map(((clans ?? []) as Clan[]).map((c) => [c.slug, c]));
  return new Map(
    (profiles ?? []).map((p) => [
      p.wallet as string,
      { wallet: p.wallet, pseudo: p.pseudo, avatar_url: p.avatar_url, clan: p.clan ? (clanBySlug.get(p.clan) ?? null) : null },
    ]),
  );
}

const withProfile = <T extends { wallet: string }>(rows: T[], profiles: Map<string, RankedProfile>) =>
  rows.map((r) => ({ ...(profiles.get(r.wallet) ?? { wallet: r.wallet, pseudo: null, avatar_url: null, clan: null }), ...r }));

/** Créateurs de la semaine : volume échangé sur leurs tokens (lundi 00:00, heure de Paris). */
export async function topCreators(): Promise<CreatorRow[]> {
  const { data, error } = await supabasePublic()
    .from("leaderboard_creators")
    .select("wallet, volume_sol, tokens_launched, trades_count")
    .or("volume_sol.gt.0,tokens_launched.gt.0")
    .order("volume_sol", { ascending: false })
    .order("tokens_launched", { ascending: false })
    .limit(LIMIT);
  if (error) throw error;
  const rows = (data ?? []) as CreatorRow[];
  return withProfile(rows, await profilesOf(rows.map((r) => r.wallet))) as CreatorRow[];
}

/** Traders de la semaine, classés par volume (et non par gains : on récompense l'activité, pas la spéculation). */
export async function topTraders(): Promise<TraderRow[]> {
  const { data, error } = await supabasePublic()
    .from("leaderboard_traders")
    .select("wallet, volume_sol, trades_count, net_sol")
    .order("volume_sol", { ascending: false })
    .limit(LIMIT);
  if (error) throw error;
  const rows = (data ?? []) as TraderRow[];
  return withProfile(rows, await profilesOf(rows.map((r) => r.wallet))) as TraderRow[];
}

export async function clanRanking(): Promise<ClanRow[]> {
  const { data, error } = await supabasePublic()
    .from("leaderboard_clans")
    .select("slug, name, hue, members, volume_sol, tokens_launched")
    .order("volume_sol", { ascending: false })
    .order("members", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClanRow[];
}
