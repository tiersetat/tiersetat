import "server-only";
import { memo } from "@/lib/memo";
import { listTokens } from "@/lib/tokens";
import { getBuzz } from "@/lib/buzz";
import { computeTrends, keywords } from "@/lib/buzz-trends";
import { trendLaunchHref } from "@/lib/buzz-links";
import { getFeed, type FeedItem } from "@/lib/feed";
import { solanaTrending } from "@/lib/market-data";
import { supabaseAdmin } from "@/lib/supabase/server";
import { memeHeadline, moverHeadline, topicHeadline } from "@/lib/gazette-text";
import type { MarketItem } from "@/components/market/MarketRow";

/** La Une : un mème Tiers-État, sinon le sujet d'actu le plus chaud, sinon la plus forte hausse de Solana. */
export type Une =
  | { kind: "meme"; kicker: string; title: string; href: string; image: string; ticker: string; name: string; progress: number; volumeSol: number; trades: number }
  | { kind: "topic"; kicker: string; title: string; href: string; sources: number; articles: number }
  | { kind: "solana"; kicker: string; title: string; href: string; image: string | null; item: MarketItem };

export type Topic = { label: string; sources: number; heat: string; href: string };

export type Gazette = { une: Une | null; movers: MarketItem[]; topics: Topic[]; dispatches: FeedItem[]; /** Heure de bouclage de l'édition */ at: number };

async function memeUne(): Promise<Une | null> {
  const [top] = await listTokens("tendances");
  if (!top) return null;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data } = await supabaseAdmin().from("trades").select("sol_amount").eq("mint", top.mint).gte("block_time", since).limit(5000);
  const volumeSol = (data ?? []).reduce((s, t) => s + Number(t.sol_amount), 0);
  const trades = data?.length ?? 0;
  const h = memeHeadline({ ticker: top.ticker, progress: Number(top.curve_progress), migrated: top.migrated, volumeSol, trades });
  return { kind: "meme", ...h, href: `/token/${top.mint}`, image: top.image_url, ticker: top.ticker, name: top.name, progress: Number(top.curve_progress), volumeSol, trades };
}

async function topics(): Promise<{ list: Topic[]; une: Une | null }> {
  const items = (await getBuzz()).items;
  const trends = computeTrends(items, 8);
  const list = trends.slice(0, 5).map((t) => ({
    label: t.label.charAt(0).toUpperCase() + t.label.slice(1),
    sources: t.sources,
    heat: t.heat,
    href: trendLaunchHref(t, items.find((i) => keywords(i.title).some((k) => k.key === t.key))),
  }));
  const top = trends[0];
  const une: Une | null = top ? { kind: "topic", ...topicHeadline(top.label, top.sources), href: list[0].href, sources: top.sources, articles: top.articles } : null;
  return { list, une };
}

export function getGazette(): Promise<Gazette> {
  return memo("gazette", 20_000, async () => {
    const [meme, buzz, trending, dispatches] = await Promise.all([
      memeUne().catch(() => null),
      topics().catch(() => ({ list: [], une: null })),
      solanaTrending().catch(() => [] as MarketItem[]),
      getFeed({ type: "tout", minUsd: 0, wallets: null }).catch(() => [] as FeedItem[]),
    ]);
    // La Bourse du peuple : plus fortes hausses, puis plus fortes baisses
    const withChange = trending.filter((t) => t.change24 !== null);
    const up = [...withChange].sort((a, b) => b.change24! - a.change24!).slice(0, 4);
    const down = [...withChange].sort((a, b) => a.change24! - b.change24!).filter((t) => t.change24! < 0).slice(0, 2);
    const best = up[0];
    const une: Une | null =
      meme ??
      buzz.une ??
      (best ? { kind: "solana", ...moverHeadline(best.symbol, best.change24), href: `/marche/${best.address}`, image: best.imageUrl, item: best } : null);
    return { une, movers: [...up, ...down], topics: buzz.list, dispatches: dispatches.slice(0, 8), at: Date.now() };
  });
}
