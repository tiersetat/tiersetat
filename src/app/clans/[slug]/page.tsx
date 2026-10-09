import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TokenCard } from "@/components/brand/TokenCard";
import { Avatar } from "@/components/social/Avatar";
import { JoinClanButton } from "@/components/social/JoinClanButton";
import { getSessionWallet } from "@/lib/auth/session";
import { displayName } from "@/lib/display";
import { clanRanking } from "@/lib/leaderboards";
import { supabasePublic } from "@/lib/supabase/public";

type Member = { wallet: string; pseudo: string | null; avatar_url: string | null };
type MemberToken = { mint: string; name: string; ticker: string; image_url: string; market_cap_sol: number; curve_progress: number };

export async function generateMetadata({ params }: PageProps<"/clans/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Clan ${slug} — Tiers-État` };
}

const fmt = (n: number) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export default async function ClanPage({ params }: PageProps<"/clans/[slug]">) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) notFound();

  const db = supabasePublic();
  const me = await getSessionWallet();
  const [ranking, { data: members }, mine] = await Promise.all([
    clanRanking().catch(() => []),
    db.from("profiles").select("wallet, pseudo, avatar_url").eq("clan", slug).order("clan_joined_at", { ascending: true }).limit(200),
    me ? db.from("profiles").select("clan").eq("wallet", me).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const index = ranking.findIndex((c) => c.slug === slug);
  if (index === -1) notFound();
  const clan = ranking[index];
  const list = (members ?? []) as Member[];
  const { data: tokens } = list.length
    ? await db
        .from("tokens")
        .select("mint, name, ticker, image_url, market_cap_sol, curve_progress")
        .in("creator_wallet", list.map((m) => m.wallet))
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: [] };

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-3xl border border-ligne p-8">
        <div aria-hidden className="absolute -top-20 -right-20 size-72 rounded-full blur-3xl" style={{ background: `hsl(${clan.hue} 70% 55% / 0.25)` }} />
        <p className="relative font-mono text-xs text-muted-foreground">Clan · #{index + 1} cette semaine</p>
        <h1 className="relative mt-2 text-4xl font-bold tracking-tight" style={{ color: `hsl(${clan.hue} 80% 86%)` }}>
          {clan.name}
        </h1>
        <dl className="relative mt-6 flex flex-wrap gap-8 text-sm">
          <div>
            <dt className="text-muted-foreground">Membres</dt>
            <dd className="font-mono text-xl">{clan.members}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Volume de la semaine</dt>
            <dd className="font-mono text-xl">{fmt(clan.volume_sol)} SOL</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tokens lancés</dt>
            <dd className="font-mono text-xl">{clan.tokens_launched}</dd>
          </div>
        </dl>
        <div className="relative mt-6">
          <JoinClanButton slug={slug} currentClan={(mine.data as { clan: string | null } | null)?.clan ?? null} />
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tokens des membres</h2>
        {(tokens ?? []).length === 0 ? (
          <p className="surface p-6 text-sm text-muted-foreground">Aucun token pour l&apos;instant. À toi de lancer le premier !</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {(tokens as MemberToken[]).map((t) => (
              <li key={t.mint}>
                <Link href={`/token/${t.mint}`} className="block">
                  <TokenCard name={t.name} ticker={t.ticker} imageUrl={t.image_url} marketCapSol={Number(t.market_cap_sol)} progress={Number(t.curve_progress)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Membres</h2>
        {list.length === 0 ? (
          <p className="surface p-6 text-sm text-muted-foreground">Aucun membre pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {list.map((m) => (
              <li key={m.wallet}>
                <Link href={`/profil/${m.wallet}`} className="chip flex items-center gap-2 py-1 pl-1">
                  <Avatar wallet={m.wallet} pseudo={m.pseudo} url={m.avatar_url} size={22} />
                  {displayName(m)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
