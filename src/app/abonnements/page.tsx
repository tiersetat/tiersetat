import type { Metadata } from "next";
import Link from "next/link";
import { ActivityFeed, type ActivityItem, type FeedProfile } from "@/components/social/ActivityFeed";
import { Avatar } from "@/components/social/Avatar";
import { getSessionWallet } from "@/lib/auth/session";
import { displayName } from "@/lib/display";
import { supabasePublic } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Mes abonnements — Tiers-État" };

export default async function AbonnementsPage() {
  const me = await getSessionWallet();
  if (!me) {
    return (
      <div className="surface mx-auto max-w-lg space-y-2 p-10 text-center">
        <h1 className="text-2xl font-semibold">Mes abonnements</h1>
        <p className="text-muted-foreground">Connecte ton wallet puis clique sur « Se connecter » pour voir l&apos;activité des comptes que tu suis.</p>
      </div>
    );
  }

  const db = supabasePublic();
  const { data: follows } = await db.from("follows").select("followee_wallet").eq("follower_wallet", me).limit(500);
  const wallets = (follows ?? []).map((f) => f.followee_wallet as string);

  const [{ data: profiles }, { data: activity }] = wallets.length
    ? await Promise.all([
        db.from("profiles").select("wallet, pseudo, avatar_url").in("wallet", wallets),
        db.from("activity").select("*").in("actor_wallet", wallets).order("at", { ascending: false }).limit(50),
      ])
    : [{ data: [] }, { data: [] }];

  const known = new Map(((profiles ?? []) as FeedProfile[]).map((p) => [p.wallet, p]));
  const feedProfiles: FeedProfile[] = wallets.map((w) => known.get(w) ?? { wallet: w, pseudo: null, avatar_url: null });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Mes abonnements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Les lancements et les trades des comptes que tu suis, en direct.</p>
        </header>
        <ActivityFeed initial={(activity ?? []) as ActivityItem[]} profiles={feedProfiles} />
      </div>
      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-sm font-medium text-muted-foreground">Tu suis {wallets.length} compte{wallets.length > 1 ? "s" : ""}</h2>
        {wallets.length === 0 ? (
          <p className="surface p-5 text-sm text-muted-foreground">
            Ouvre le profil d&apos;un créateur (depuis un token ou l&apos;historique des échanges) et clique sur « Suivre ».
          </p>
        ) : (
          <ul className="surface divide-y divide-ligne">
            {feedProfiles.map((p) => (
              <li key={p.wallet}>
                <Link href={`/profil/${p.wallet}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/[0.03]">
                  <Avatar wallet={p.wallet} pseudo={p.pseudo} url={p.avatar_url} size={28} />
                  {displayName(p)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
