import "server-only";
import type { MarketItem } from "@/components/market/MarketRow";
import { dexPaidLatest, dexPaidTrending, frenchMemes, topCryptos, type ChainId } from "@/lib/market-feeds";
import { memesBy } from "@/lib/market-data";
import { hyperliquidMarkets, type Category } from "@/lib/hyperliquid";
import { solUsd } from "@/lib/feed";
import { listTokens, type Tab, type TokenCard } from "@/lib/tokens";
import { TOTAL_SUPPLY } from "@/lib/traders";
import { CATS, type Key } from "@/lib/market-tabs";

function fromMeme(t: TokenCard, sol: number | null): MarketItem {
  const mcapUsd = sol === null ? null : Number(t.market_cap_sol) * sol;
  return {
    address: t.mint,
    name: t.name,
    symbol: t.ticker,
    imageUrl: t.image_url,
    priceUsd: mcapUsd === null ? null : mcapUsd / TOTAL_SUPPLY,
    mcapUsd,
    change24: null,
    progress: t.migrated ? undefined : Number(t.curve_progress),
    href: `/token/${t.mint}`,
  };
}

export async function loadList(key: Key, chain: ChainId | null, cat: Category | null): Promise<MarketItem[] | null> {
  if (key === "liste" || key === "nouveaux") return null;
  if (key === "detenus") return memesBy("detenus");
  if (key === "migre" || key === "bonding") {
    // Nos mèmes d'abord, puis les tokens du marché (DEX payé) selon leur plateforme
    const [ours, market] = await Promise.all([memesBy(key), dexPaidTrending().catch(() => [])]);
    const ext = market.filter((t) => (key === "bonding" ? t.bonding : !t.bonding) && (!chain || t.chain === chain));
    return [...ours, ...ext];
  }
  if (key === "bourse") {
    const all = await hyperliquidMarkets();
    return all
      .filter((m) => !cat || m.category === cat)
      .map((m) => ({ address: m.id, name: m.name, symbol: m.symbol, imageUrl: m.imageUrl, emoji: m.emoji, priceUsd: m.priceUsd, mcapUsd: null, change24: m.change24, leverage: m.maxLeverage, href: `/bourse/${encodeURIComponent(m.id)}` }));
  }
  if (key === "cryptos") return topCryptos();
  if (key === "dexpaye") {
    const all = await dexPaidLatest();
    return chain ? all.filter((t) => t.chain === chain) : all;
  }
  if (key === "francais") return frenchMemes();
  if (key === "tendances") {
    const all = await dexPaidTrending();
    return chain ? all.filter((t) => t.chain === chain) : all;
  }
  const [memes, sol] = await Promise.all([listTokens("tendances" as Tab), solUsd().catch(() => null)]);
  return memes.map((m) => fromMeme(m, sol));
}

