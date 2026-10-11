import "server-only";
import { majorsRadar, tokensByAddresses, trendingWithImages, type RadarToken } from "@/lib/radar";
import { supabasePublic } from "@/lib/supabase/public";
import type { MarketItem } from "@/components/market/MarketRow";
import { hyperliquidMarkets } from "@/lib/hyperliquid";

const fromRadar = (t: RadarToken): MarketItem => ({
  address: t.address,
  name: t.name,
  symbol: t.symbol,
  imageUrl: t.imageUrl,
  priceUsd: t.priceUsd,
  mcapUsd: t.mcapUsd,
  change24: t.change.h24,
});

/** Cours du SOL en dollars (pour convertir les mèmes Tiers-État, cotés en SOL). */
async function solUsd(): Promise<number | null> {
  const [sol] = await majorsRadar().catch(() => []);
  return sol?.priceUsd ?? null;
}

export async function solanaTrending(): Promise<MarketItem[]> {
  return (await trendingWithImages()).map(fromRadar);
}

export async function cryptos(): Promise<MarketItem[]> {
  return (await majorsRadar()).map(fromRadar);
}

/** Fiches pour « Ma liste » : mèmes Tiers-État (lus en base) et tokens Solana externes (DexScreener). */
export async function itemsFor(addresses: string[]): Promise<MarketItem[]> {
  const all = addresses.slice(0, 100);
  if (all.length === 0) return [];
  const perpIds = all.filter((a) => a.includes(":"));
  const perps = perpIds.length ? await hyperliquidMarkets().catch(() => []) : [];
  const perpItems = new Map(
    perps
      .filter((m) => perpIds.includes(m.id))
      .map((m) => [m.id, { address: m.id, name: m.name, symbol: m.symbol, imageUrl: m.imageUrl, emoji: m.emoji, priceUsd: m.priceUsd, mcapUsd: null, change24: m.change24, leverage: m.maxLeverage, href: `/bourse/${encodeURIComponent(m.id)}` } as MarketItem]),
  );
  const list = all.filter((a) => !a.includes(":"));
  if (list.length === 0) return all.flatMap((a) => (perpItems.has(a) ? [perpItems.get(a)!] : []));
  const { data: ours } = await supabasePublic()
    .from("tokens")
    .select("mint, name, ticker, image_url, market_cap_sol, total_supply:market_cap_sol")
    .in("mint", list)
    .eq("hidden", false);
  const ourMints = new Set((ours ?? []).map((t) => t.mint));
  const [external, sol] = await Promise.all([tokensByAddresses(list.filter((a) => !ourMints.has(a))).catch(() => []), ours?.length ? solUsd() : null]);
  const byAddr = new Map<string, MarketItem>();
  for (const t of ours ?? []) {
    const mcapUsd = sol === null ? null : Number(t.market_cap_sol) * sol;
    byAddr.set(t.mint, {
      address: t.mint,
      name: t.name,
      symbol: t.ticker,
      imageUrl: t.image_url,
      priceUsd: mcapUsd === null ? null : mcapUsd / 1e9,
      mcapUsd,
      change24: null,
      href: `/token/${t.mint}`,
    });
  }
  for (const t of external) byAddr.set(t.address, fromRadar(t));
  return all.flatMap((a) => (byAddr.has(a) ? [byAddr.get(a)!] : perpItems.has(a) ? [perpItems.get(a)!] : []));
}
