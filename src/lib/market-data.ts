import "server-only";
import { majorsRadar, tokensByAddresses, trendingWithImages, type RadarToken } from "@/lib/radar";
import { supabasePublic } from "@/lib/supabase/public";
import type { MarketItem } from "@/components/market/MarketRow";

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
  const list = addresses.slice(0, 100);
  if (list.length === 0) return [];
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
  return list.flatMap((a) => (byAddr.has(a) ? [byAddr.get(a)!] : []));
}
