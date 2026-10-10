import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportButton } from "@/components/moderation/ReportButton";
import { RiskPanel } from "@/components/token/RiskPanel";
import { HoldersPanel } from "@/components/token/HoldersPanel";
import { TradersPanel } from "@/components/token/TradersPanel";
import { aggregateTraders, TOTAL_SUPPLY } from "@/lib/traders";
import { solUsd } from "@/lib/feed";
import { getHolders } from "@/lib/holders";
import { Comments } from "@/components/token/Comments";
import { ShareButton } from "@/components/token/ShareButton";
import { WatchStar } from "@/components/market/WatchStar";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { getCreatorTrust } from "@/lib/creator-trust-data";
import { MyPositionLink } from "@/components/token/MyPositionLink";
import { supabasePublic } from "@/lib/supabase/public";
import type { Metadata } from "next";
import { CreatorEarnings } from "@/components/social/CreatorEarnings";
import { TokenLive } from "@/components/token/TokenLive";
import { getRiskReport } from "@/lib/risk";
import { buyWarnings, riskFlags } from "@/lib/risk-flags";
import type { TradeRow } from "@/lib/candles";
import { explorerUrl } from "@/lib/solana/config";
import { supabaseAdmin } from "@/lib/supabase/server";
import { solanaAddress } from "@/lib/validators";

type TokenRow = {
  mint: string;
  pool: string;
  name: string;
  ticker: string;
  description: string | null;
  image_url: string;
  twitter_url: string | null;
  website_url: string | null;
  source_url: string | null;
  creator_wallet: string;
  launch_signature: string;
  market_cap_sol: number;
  curve_progress: number;
  migrated: boolean;
  hidden: boolean;
  created_at: string;
};

export async function generateMetadata({ params }: PageProps<"/token/[mint]">): Promise<Metadata> {
  const { mint } = await params;
  const { data } = await supabasePublic().from("tokens").select("name, ticker, description").eq("mint", mint).maybeSingle();
  if (!data) return { title: "Token — Tiers-État" };
  return {
    title: `${data.name} ($${data.ticker}) — Tiers-État`,
    description: data.description || `${data.name} ($${data.ticker}), un mème frappé sur Tiers-État, le launchpad des mèmes français.`,
    twitter: { card: "summary_large_image" },
  };
}

export default async function TokenPage({ params }: PageProps<"/token/[mint]">) {
  const { mint } = await params;
  if (!solanaAddress.safeParse(mint).success) notFound();

  const { data: token } = await supabaseAdmin()
    .from("tokens")
    .select("*")
    .eq("mint", mint)
    .maybeSingle<TokenRow>();
  if (!token) notFound();

  if (token.hidden) {
    return (
      <div className="surface mx-auto max-w-lg space-y-2 p-10 text-center">
        <h1 className="text-2xl font-semibold">Token masqué</h1>
        <p className="text-muted-foreground">Ce token a été retiré par la modération.</p>
      </div>
    );
  }

  const [{ data: trades }, risk, holders] = await Promise.all([
    supabaseAdmin()
      .from("trades")
      .select("signature, trader_wallet, side, sol_amount, token_amount, price_sol, block_time")
      .eq("mint", mint)
      .order("block_time", { ascending: true })
      .limit(2000),
    getRiskReport(token),
    getHolders(token),
  ]);
  const flags = riskFlags(risk);

  // Traders : positions au prix actuel, profils et dernière thèse de chacun
  const traders = aggregateTraders(
    ((trades ?? []) as { trader_wallet: string; side: "buy" | "sell"; sol_amount: number; token_amount: number; price_sol: number; block_time: string; signature: string }[]),
    Number(token.market_cap_sol) / TOTAL_SUPPLY,
  );
  const traderWallets = traders.slice(0, 40).map((t) => t.wallet);
  const [{ data: traderProfiles }, { data: traderComments }, sol] = await Promise.all([
    traderWallets.length ? supabaseAdmin().from("profiles").select("wallet, pseudo, avatar_url").in("wallet", traderWallets) : Promise.resolve({ data: [] }),
    traderWallets.length
      ? supabaseAdmin().from("comments").select("author_wallet, body, created_at").eq("mint", mint).eq("hidden", false).in("author_wallet", traderWallets).order("created_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
    solUsd().catch(() => null),
  ]);
  const profilesByWallet = Object.fromEntries((traderProfiles ?? []).map((p) => [p.wallet, { pseudo: p.pseudo, avatar_url: p.avatar_url }]));
  const theses: Record<string, string> = {};
  for (const c of traderComments ?? []) if (!theses[c.author_wallet]) theses[c.author_wallet] = c.body;

  const trust = await getCreatorTrust(token.creator_wallet).catch(() => null);
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="size-28 shrink-0 overflow-hidden rounded-2xl border border-ligne bg-white/[0.03] sm:size-32">
          {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS */}
          <img src={token.image_url} alt="" className="size-full object-cover" />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{token.name}</h1>
            <span className="font-mono text-lg text-pervenche">${token.ticker}</span>
          </div>
          {token.description && <p className="max-w-2xl text-muted-foreground">{token.description}</p>}
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <a href={explorerUrl("address", token.mint)} target="_blank" rel="noreferrer" className="chip font-mono">
              {token.mint.slice(0, 4)}…{token.mint.slice(-4)} ↗
            </a>
            <Link href={`/profil/${token.creator_wallet}`} className="chip">
              Créateur {token.creator_wallet.slice(0, 4)}…{token.creator_wallet.slice(-4)}
            </Link>
            {trust && <TrustBadge trust={trust} />}
            {token.twitter_url && (
              <a href={token.twitter_url} target="_blank" rel="noreferrer" className="chip">
                X ↗
              </a>
            )}
            {token.website_url && (
              <a href={token.website_url} target="_blank" rel="noreferrer" className="chip">
                Site ↗
              </a>
            )}
            {token.source_url && (
              <a href={token.source_url} target="_blank" rel="noreferrer" className="chip">
                Actu source ↗
              </a>
            )}
            <span className="chip pointer-events-none" suppressHydrationWarning>
              Créé le {new Date(token.created_at).toLocaleDateString("fr-FR")}
            </span>
            <MyPositionLink mint={token.mint} />
            <WatchStar address={token.mint} />
            <ShareButton name={token.name} ticker={token.ticker} path={`/token/${token.mint}`} />
            <ReportButton mint={token.mint} />
          </div>
        </div>
      </header>

      <TokenLive
        mint={token.mint}
        pool={token.pool}
        ticker={token.ticker}
        initialTrades={(trades ?? []) as TradeRow[]}
        createdAt={token.created_at}
        initial={{ market_cap_sol: token.market_cap_sol, curve_progress: token.curve_progress, migrated: token.migrated }}
        warnings={buyWarnings(flags)}
        below={
          <div className="space-y-10">
            <TradersPanel rows={traders} profiles={profilesByWallet} theses={theses} solUsd={sol} creator={token.creator_wallet} />
            <Comments mint={token.mint} />
          </div>
        }
        sidebar={
          <>
            <CreatorEarnings compact creator={token.creator_wallet} tokens={[{ mint: token.mint, name: token.name, ticker: token.ticker, pool: token.pool }]} />
            <RiskPanel flags={flags} />
            <HoldersPanel holders={holders} />
          </>
        }
      />
    </div>
  );
}
