import "server-only";
import { rankCahiers, scoreCahier, type Cahier, type CahierStats } from "@/lib/cahiers";
import type { Clan } from "@/lib/clans";
import { getFounders } from "@/lib/founders-data";
import { memo } from "@/lib/memo";
import { supabasePublic } from "@/lib/supabase/public";

export type CahierRow = Cahier & { pseudo: string | null; avatar_url: string | null; clan: Clan | null; founder: number | null };

/** Classement des Cahiers (top `limit`) et cahier du compte connecté avec sa position. null si la vue n'existe pas encore. */
export async function getCahiers(me: string | null, limit = 50) {
  const db = supabasePublic();
  // Statistiques partagées par tous les visiteurs (cache 30 s) ; seul « mon cahier » est personnalisé
  const stats = await memo("cahiers", 30_000, async () => {
    const { data, error } = await db.from("cahiers_stats").select("*").limit(10_000).returns<CahierStats[]>();
    if (error) throw error;
    return data ?? [];
  }).catch(() => null);
  if (!stats) return null;
  const founders = await getFounders().catch(() => null);
  const data = stats.map((st) => ({ ...st, founder: founders?.byWallet.has(st.wallet) ?? false }));
  const ranked = rankCahiers(data ?? []);
  const top = ranked.slice(0, limit);

  const wallets = [...new Set([...top.map((c) => c.wallet), ...(me ? [me] : [])])];
  const [{ data: profiles }, { data: clans }] = await Promise.all([
    wallets.length ? db.from("profiles").select("wallet, pseudo, avatar_url, clan").in("wallet", wallets) : Promise.resolve({ data: [] }),
    db.from("clans").select("slug, name, hue"),
  ]);
  const clanBySlug = new Map(((clans ?? []) as Clan[]).map((c) => [c.slug, c]));
  const byWallet = new Map(
    ((profiles ?? []) as { wallet: string; pseudo: string | null; avatar_url: string | null; clan: string | null }[]).map((p) => [p.wallet, p]),
  );
  const withProfile = (c: Cahier): CahierRow => {
    const p = byWallet.get(c.wallet);
    return {
      ...c,
      pseudo: p?.pseudo ?? null,
      avatar_url: p?.avatar_url ?? null,
      clan: p?.clan ? (clanBySlug.get(p.clan) ?? null) : null,
      founder: founders?.byWallet.get(c.wallet) ?? null,
    };
  };

  let mine: { cahier: CahierRow; position: number | null } | null = null;
  if (me) {
    const index = ranked.findIndex((c) => c.wallet === me);
    const stats = (data ?? []).find((s) => s.wallet === me);
    const cahier = index >= 0 ? ranked[index] : scoreCahier(stats ?? { wallet: me, tokens_created: 0, volume_sol: 0, tokens_traded: 0, comments: 0, followers: 0, has_clan: false, creator_volume_sol: 0 });
    mine = { cahier: withProfile(cahier), position: index >= 0 ? index + 1 : null };
  }
  return { top: top.map(withProfile), total: ranked.length, mine, founders };
}
