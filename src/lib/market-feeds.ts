import "server-only";
import { memo } from "@/lib/memo";
import type { MarketItem } from "@/components/market/MarketRow";

/** Blockchains suivies par le marché (identifiants DexScreener). */
export const CHAINS = {
  solana: { label: "Solana", short: "SOL", color: "#9945ff" },
  robinhood: { label: "Robinhood", short: "HOOD", color: "#ccff00" },
  base: { label: "Base", short: "BASE", color: "#0052ff" },
  bsc: { label: "BNB", short: "BNB", color: "#f3ba2f" },
  ethereum: { label: "Ethereum", short: "ETH", color: "#8a92b2" },
} as const;
export type ChainId = keyof typeof CHAINS;
export const isChain = (v: unknown): v is ChainId => typeof v === "string" && v in CHAINS;

type DexPair = {
  chainId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h1?: number; h6?: number; h24?: number };
  priceChange?: { h1?: number; h6?: number; h24?: number };
  txns?: { h6?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

/** Meilleure paire (la plus liquide) de chaque token, en lots de 30 adresses par blockchain. */
async function bestPairs(byChain: Map<ChainId, string[]>): Promise<DexPair[]> {
  const calls: Promise<DexPair[]>[] = [];
  for (const [chain, addrs] of byChain) {
    for (let i = 0; i < addrs.length; i += 30) {
      calls.push(getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/${chain}/${addrs.slice(i, i + 30).join(",")}`).catch(() => []));
    }
  }
  const best = new Map<string, DexPair>();
  for (const p of (await Promise.all(calls)).flat()) {
    const key = `${p.chainId}:${p.baseToken.address.toLowerCase()}`;
    const cur = best.get(key);
    if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(key, p);
  }
  return [...best.values()];
}

export type TrendItem = MarketItem & { chain: ChainId; paid: boolean; volume6h: number; createdAt: number | null };

/**
 * Tendances : les tokens « DEX payé » (profil payant DexScreener) et boostés, sur toutes nos blockchains,
 * gardés seulement s'il y a du monde dedans (volume et liquidité), triés par volume des 6 dernières heures.
 */
export function dexPaidTrending(): Promise<TrendItem[]> {
  return memo("feeds:trending", 60_000, async () => {
    type Listed = { chainId: string; tokenAddress: string; icon?: string };
    const lists = await Promise.all(
      ["token-profiles/latest/v1", "token-boosts/latest/v1", "token-boosts/top/v1"].map((p) => getJson<Listed[]>(`https://api.dexscreener.com/${p}`).catch(() => [] as Listed[])),
    );
    const icons = new Map<string, string>();
    const byChain = new Map<ChainId, string[]>();
    for (const t of lists.flat()) {
      if (!isChain(t.chainId)) continue;
      const list = byChain.get(t.chainId) ?? [];
      if (!list.includes(t.tokenAddress)) list.push(t.tokenAddress);
      byChain.set(t.chainId, list);
      if (t.icon) icons.set(`${t.chainId}:${t.tokenAddress.toLowerCase()}`, t.icon);
    }
    const pairs = await bestPairs(byChain);
    return pairs
      .filter((p) => (p.liquidity?.usd ?? 0) >= 5_000 && (p.volume?.h6 ?? 0) >= 2_000)
      .map((p): TrendItem => {
        const key = `${p.chainId}:${p.baseToken.address.toLowerCase()}`;
        return {
          address: p.baseToken.address,
          name: p.baseToken.name,
          symbol: p.baseToken.symbol,
          imageUrl: p.info?.imageUrl ?? icons.get(key) ?? null,
          priceUsd: num(p.priceUsd),
          mcapUsd: num(p.marketCap ?? p.fdv),
          change24: num(p.priceChange?.h24),
          chain: p.chainId as ChainId,
          paid: true,
          volume6h: p.volume?.h6 ?? 0,
          createdAt: num(p.pairCreatedAt),
          href: `/marche/${p.baseToken.address}?c=${p.chainId}`,
        };
      })
      .sort((a, b) => b.volume6h - a.volume6h)
      .slice(0, 100);
  });
}

/** Stablecoins exclus de la liste des cryptos (leur cours ne bouge pas). */
const STABLES = new Set(["usdt", "usdc", "dai", "fdusd", "usde", "usds", "pyusd", "tusd", "usd1", "rlusd", "usdd", "gusd", "usdp", "frax", "lusd", "susd", "usdy", "usd0", "bfusd", "usdtb", "susde", "eurc"]);

type CgCoin = { id: string; symbol: string; name: string; image: string; current_price: number | null; market_cap: number | null; price_change_percentage_24h: number | null };

/** Les grandes cryptos du monde (classement CoinGecko par capitalisation), sans les stablecoins. */
export function topCryptos(): Promise<MarketItem[]> {
  return memo("feeds:cryptos", 300_000, async () => {
    const coins = await getJson<CgCoin[]>("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h");
    return coins
      .filter((c) => !STABLES.has(c.symbol.toLowerCase()))
      .map((c) => ({
        address: c.id,
        name: c.name,
        symbol: c.symbol.toUpperCase(),
        imageUrl: c.image,
        priceUsd: c.current_price,
        mcapUsd: c.market_cap,
        change24: c.price_change_percentage_24h,
        href: `/crypto/${c.id}`,
      }));
  });
}
