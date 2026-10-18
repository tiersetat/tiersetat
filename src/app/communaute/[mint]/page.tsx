import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityChat } from "@/components/community/CommunityChat";
import { DefisPanel } from "@/components/community/DefisPanel";
import { supabasePublic } from "@/lib/supabase/public";
import { solanaAddress } from "@/lib/validators";

type Token = { mint: string; name: string; ticker: string; image_url: string; creator_wallet: string };

async function getToken(mint: string): Promise<Token | null> {
  if (!solanaAddress.safeParse(mint).success) return null;
  const { data } = await supabasePublic().from("tokens").select("mint, name, ticker, image_url, creator_wallet").eq("mint", mint).eq("hidden", false).maybeSingle<Token>();
  return data ?? null;
}

export async function generateMetadata({ params }: PageProps<"/communaute/[mint]">): Promise<Metadata> {
  const token = await getToken((await params).mint);
  return { title: token ? `Communauté $${token.ticker} — Tiers-État` : "Communauté — Tiers-État" };
}

/** La communauté d'un mème : son créateur et tous ses traders, en messagerie. */
export default async function CommunautePage({ params }: PageProps<"/communaute/[mint]">) {
  const token = await getToken((await params).mint);
  if (!token) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <header className="flex items-center gap-3">
        <Link href="/fil?vue=communautes" className="chip shrink-0 px-3 py-1.5 text-xs" aria-label="Toutes les communautés">
          ←
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
        <img src={token.image_url} alt="" className="size-11 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold">Communauté ${token.ticker}</h1>
          <p className="truncate text-xs text-muted-foreground">{token.name}</p>
        </div>
        <Link href={`/token/${token.mint}`} className="btn-ghost min-h-9 shrink-0 px-4 py-1.5 text-sm">
          Le mème
        </Link>
      </header>
      <DefisPanel mint={token.mint} ticker={token.ticker} creator={token.creator_wallet} />
      <CommunityChat mint={token.mint} ticker={token.ticker} creator={token.creator_wallet} />
    </div>
  );
}
