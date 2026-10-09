import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TokenCard } from "@/components/brand/TokenCard";
import { Avatar } from "@/components/social/Avatar";
import { CreatorEarnings } from "@/components/social/CreatorEarnings";
import { ClanBadge } from "@/components/social/ClanBadge";
import { FollowButton } from "@/components/social/FollowButton";
import { ProfileEditor } from "@/components/social/ProfileEditor";
import { getSessionWallet } from "@/lib/auth/session";
import { displayName } from "@/lib/display";
import { explorerUrl } from "@/lib/solana/config";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseAdmin } from "@/lib/supabase/server";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { getCreatorTrust } from "@/lib/creator-trust-data";
import { getFounders } from "@/lib/founders-data";
import { FounderBadge } from "@/components/trust/FounderBadge";
import { solanaAddress } from "@/lib/validators";

type Profile = { wallet: string; pseudo: string | null; avatar_url: string | null; bio: string | null; clan?: string | null };
type CreatedToken = { mint: string; pool: string; name: string; ticker: string; image_url: string; market_cap_sol: number; curve_progress: number };
type TradeWithToken = {
  signature: string;
  side: "buy" | "sell";
  sol_amount: number;
  token_amount: number;
  block_time: string;
  mint: string;
  tokens: { name: string; ticker: string; image_url: string };
};

export async function generateMetadata({ params }: PageProps<"/profil/[wallet]">): Promise<Metadata> {
  const { wallet } = await params;
  return { title: `Profil ${wallet.slice(0, 4)}…${wallet.slice(-4)} — Tiers-État` };
}

const fmt = (n: number, d = 2) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });

export default async function ProfilePage({ params }: PageProps<"/profil/[wallet]">) {
  const { wallet } = await params;
  if (!solanaAddress.safeParse(wallet).success) notFound();

  const db = supabasePublic();
  const [me, profileRes, tokensRes, tradesRes, followersRes, followingRes] = await Promise.all([
    getSessionWallet(),
    db.from("profiles").select("wallet, pseudo, avatar_url, bio, clan").eq("wallet", wallet).maybeSingle<Profile>(),
    db.from("tokens").select("mint, pool, name, ticker, image_url, market_cap_sol, curve_progress").eq("creator_wallet", wallet).order("created_at", { ascending: false }).limit(30),
    db
      .from("trades")
      .select("signature, side, sol_amount, token_amount, block_time, mint, tokens!inner(name, ticker, image_url)")
      .eq("trader_wallet", wallet)
      .order("block_time", { ascending: false })
      .limit(1000),
    db.from("follows").select("follower_wallet", { count: "exact", head: true }).eq("followee_wallet", wallet),
    db.from("follows").select("followee_wallet", { count: "exact", head: true }).eq("follower_wallet", wallet),
  ]);

  const profile: Profile = profileRes.data ?? { wallet, pseudo: null, avatar_url: null, bio: null };
  const [trust, founders] = await Promise.all([getCreatorTrust(wallet).catch(() => null), getFounders().catch(() => null)]);
  const founderN = founders?.byWallet.get(wallet) ?? null;
  const tokens = (tokensRes.data ?? []) as CreatedToken[];
  const trades = (tradesRes.data ?? []) as unknown as TradeWithToken[];
  const volume = trades.reduce((s, t) => s + Number(t.sol_amount), 0);

  const { data: clan } = profile.clan
    ? await db.from("clans").select("slug, name, hue").eq("slug", profile.clan).maybeSingle<{ slug: string; name: string; hue: number }>()
    : { data: null };

  // Pour son propre profil, tous ses tokens (même masqués) : les frais de créateur restent dus
  const earningTokens =
    me === wallet
      ? (((await supabaseAdmin().from("tokens").select("mint, pool, name, ticker").eq("creator_wallet", wallet).limit(200)).data ?? []) as {
          mint: string;
          pool: string;
          name: string;
          ticker: string;
        }[])
      : [];

  let isFollowing = false;
  if (me && me !== wallet) {
    const { data } = await db.from("follows").select("follower_wallet").eq("follower_wallet", me).eq("followee_wallet", wallet).maybeSingle();
    isFollowing = Boolean(data);
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar wallet={wallet} pseudo={profile.pseudo} url={profile.avatar_url} size={96} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{displayName(profile)}</h1>
            {clan ? (
              <ClanBadge clan={clan} size="lg" />
            ) : me === wallet ? (
              <Link href="/clans" className="chip">
                Rejoindre un clan →
              </Link>
            ) : null}
          </div>
          <a href={explorerUrl("address", wallet)} target="_blank" rel="noreferrer" className="block font-mono text-xs break-all text-muted-foreground hover:text-pervenche">
            {wallet} ↗
          </a>
          {founderN && <FounderBadge n={founderN} />}
          {profile.bio && <p className="max-w-2xl text-muted-foreground">{profile.bio}</p>}
          {trust && trust.niveau !== "nouveau" && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">Confiance créateur</span>
              <TrustBadge trust={trust} withDetail />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <FollowButton wallet={wallet} initialFollowing={isFollowing} initialFollowers={followersRes.count ?? 0} />
            <ProfileEditor wallet={wallet} />
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-2 divide-ligne rounded-2xl border border-ligne bg-white/[0.02] sm:grid-cols-4 sm:divide-x">
        {[
          { label: "Tokens créés", value: fmt(tokens.length, 0) },
          { label: "Trades", value: fmt(trades.length, 0) },
          { label: "Volume", value: `${fmt(volume, 3)} SOL` },
          { label: "Abonnements", value: fmt(followingRes.count ?? 0, 0) },
        ].map((s) => (
          <div key={s.label} className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 font-mono text-lg font-medium">{s.value}</dd>
          </div>
        ))}
      </dl>

      {me === wallet && (
        <CreatorEarnings creator={wallet} tokens={earningTokens} />
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Tokens créés</h2>
        {tokens.length === 0 ? (
          <p className="surface p-6 text-sm text-muted-foreground">Aucun token créé pour l&apos;instant.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {tokens.map((t) => (
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
        <h2 className="text-xl font-semibold">Trades récents</h2>
        {trades.length === 0 ? (
          <p className="surface p-6 text-sm text-muted-foreground">Aucun trade pour l&apos;instant.</p>
        ) : (
          <ul className="surface divide-y divide-ligne">
            {trades.slice(0, 20).map((t) => (
              <li key={t.signature} className="flex items-center gap-3 px-5 py-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS */}
                <img src={t.tokens.image_url} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
                <span className={`w-14 font-medium ${t.side === "buy" ? "text-achat" : "text-vente"}`}>{t.side === "buy" ? "Achat" : "Vente"}</span>
                <Link href={`/token/${t.mint}`} className="min-w-0 flex-1 truncate hover:text-pervenche">
                  {t.tokens.name} <span className="font-mono text-xs text-pervenche">${t.tokens.ticker}</span>
                </Link>
                <span className="font-mono text-xs">{fmt(Number(t.sol_amount), 4)} SOL</span>
                <a href={explorerUrl("tx", t.signature)} target="_blank" rel="noreferrer" className="hidden font-mono text-xs text-muted-foreground hover:text-pervenche sm:inline" suppressHydrationWarning>
                  {new Date(t.block_time).toLocaleDateString("fr-FR")} ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
