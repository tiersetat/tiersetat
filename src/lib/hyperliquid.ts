import "server-only";
import { memo } from "@/lib/memo";
import { MARKET_LOGOS } from "@/lib/market-logos";

/**
 * Marchés « traditionnels » d'Hyperliquid (HIP-3) : actions, indices, matières premières, devises, pré-IPO,
 * sous forme de contrats perpétuels avec effet de levier. Données publiques de l'API Hyperliquid.
 */
export type Category = "actions" | "indices" | "matieres" | "devises" | "pre-ipo" | "taux";
export type PerpMarket = {
  /** Identifiant Hyperliquid, ex. « xyz:TSLA » */
  id: string;
  symbol: string;
  name: string;
  category: Category;
  venue: string;
  priceUsd: number | null;
  change24: number | null;
  volume24Usd: number;
  openInterestUsd: number;
  maxLeverage: number;
  /** Financement horaire (en %) */
  fundingPct: number | null;
  /** Logo de l'entreprise, ou pictogramme pour les indices, matières premières, devises et taux */
  imageUrl: string | null;
  emoji: string | null;
};

/** Vraie image du marché (logo officiel ou photo), hébergée par Tiers-État. */
function logoOf(symbol: string): { imageUrl: string | null; emoji: null } {
  return { imageUrl: MARKET_LOGOS.has(symbol) ? `/images/marches/${encodeURIComponent(symbol)}.webp` : null, emoji: null };
}

type Meta = { universe: { name: string; maxLeverage: number; isDelisted?: boolean }[] };
type Ctx = { markPx?: string; prevDayPx?: string; dayNtlVlm?: string; openInterest?: string; funding?: string };

async function dexes(): Promise<string[]> {
  const res = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "perpDexs" }), signal: AbortSignal.timeout(7000) });
  const list = (await res.json()) as ({ name: string } | null)[];
  return list.flatMap((d) => (d?.name ? [d.name] : []));
}

async function marketsOf(dex: string): Promise<PerpMarket[]> {
  const res = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs", dex }), signal: AbortSignal.timeout(7000) });
  const [meta, ctx] = (await res.json()) as [Meta, Ctx[]];
  return meta.universe.flatMap((a, i): PerpMarket[] => {
    if (a.isDelisted) return [];
    const c = ctx[i] ?? {};
    const symbol = a.name.split(":")[1] ?? a.name;
    const px = Number(c.markPx);
    const prev = Number(c.prevDayPx);
    const [name, category] = INFO[symbol] ?? [symbol];
    return [
      {
        id: a.name,
        symbol,
        name,
        category: category ?? "actions",
        venue: dex,
        priceUsd: Number.isFinite(px) && px > 0 ? px : null,
        change24: px > 0 && prev > 0 ? ((px - prev) / prev) * 100 : null,
        volume24Usd: Number(c.dayNtlVlm ?? 0),
        openInterestUsd: Number(c.openInterest ?? 0) * (px || 0),
        maxLeverage: a.maxLeverage,
        fundingPct: c.funding ? Number(c.funding) * 100 : null,
        ...logoOf(symbol),
      },
    ];
  });
}

/** Tous les marchés HIP-3 actifs ; un symbole présent chez plusieurs fournisseurs garde le plus échangé. */
export function hyperliquidMarkets(): Promise<PerpMarket[]> {
  return memo("hl:markets", 30_000, async () => {
    const all = (await Promise.all((await dexes()).map((d) => marketsOf(d).catch(() => [])))).flat();
    const best = new Map<string, PerpMarket>();
    for (const m of all) {
      const cur = best.get(m.symbol);
      if (!cur || m.volume24Usd > cur.volume24Usd) best.set(m.symbol, m);
    }
    return [...best.values()].sort((a, b) => b.volume24Usd - a.volume24Usd);
  });
}

export async function hyperliquidMarket(id: string): Promise<PerpMarket | null> {
  return (await hyperliquidMarkets()).find((m) => m.id === id || m.symbol === id) ?? null;
}
