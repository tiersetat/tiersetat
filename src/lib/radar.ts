import "server-only";
import { memo } from "@/lib/memo";
import { isSolanaAddress, normalizeTicker, type RadarStats } from "@/lib/radar-utils";

/** Données publiques du marché réel (DexScreener, GeckoTerminal) : lecture seule, pour information. */

export type RadarToken = RadarStats & {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  dexUrl: string;
  links: { label: string; url: string }[];
};

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const STABLES = new Set(["SOL", "WSOL", "USDC", "USDT"]);

type DexPair = {
  chainId: string;
  url: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { m5?: number; h1?: number; h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
  info?: { imageUrl?: string; websites?: { label?: string; url: string }[]; socials?: { type: string; url: string }[] };
};

function fromPair(p: DexPair): RadarToken {
  const links = [
    ...(p.info?.websites ?? []).map((w) => ({ label: w.label || "Site", url: w.url })),
    ...(p.info?.socials ?? []).map((s) => ({ label: s.type === "twitter" ? "X" : s.type.charAt(0).toUpperCase() + s.type.slice(1), url: s.url })),
  ].filter((l) => /^https:\/\//.test(l.url));
  return {
    address: p.baseToken.address,
    name: p.baseToken.name,
    symbol: p.baseToken.symbol,
    imageUrl: p.info?.imageUrl && /^https:\/\//.test(p.info.imageUrl) ? p.info.imageUrl : null,
    dexUrl: p.url,
    links,
    priceUsd: num(p.priceUsd),
    mcapUsd: num(p.marketCap ?? p.fdv),
    liquidityUsd: num(p.liquidity?.usd),
    volume24Usd: num(p.volume?.h24),
    change: { m5: num(p.priceChange?.m5), h1: num(p.priceChange?.h1), h24: num(p.priceChange?.h24) },
    buys24: num(p.txns?.h24?.buys),
    sells24: num(p.txns?.h24?.sells),
    createdAt: num(p.pairCreatedAt),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

/** Garde, pour chaque token, sa paire la plus liquide. */
function bestByToken(pairs: DexPair[]): RadarToken[] {
  const best = new Map<string, DexPair>();
  for (const p of pairs) {
    if (p.chainId !== "solana" || STABLES.has(p.baseToken.symbol.toUpperCase())) continue;
    const cur = best.get(p.baseToken.address);
    if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(p.baseToken.address, p);
  }
  return [...best.values()].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)).map(fromPair);
}

/** Recherche façon Rick : une adresse (fiche exacte) ou un ticker / nom (meilleures correspondances sur Solana). */
export function searchRadar(query: string): Promise<RadarToken[]> {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  return memo(`radar:q:${q.toLowerCase()}`, 30_000, async () => {
    if (isSolanaAddress(q)) {
      const pairs = await getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/solana/${q}`);
      return bestByToken(pairs).slice(0, 1);
    }
    const ticker = normalizeTicker(q);
    const { pairs } = await getJson<{ pairs: DexPair[] | null }>(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(ticker)}`);
    const tokens = bestByToken(pairs ?? []);
    // Ticker exact d'abord, puis le reste par liquidité
    return [...tokens.filter((t) => t.symbol.toUpperCase() === ticker), ...tokens.filter((t) => t.symbol.toUpperCase() !== ticker)].slice(0, 6);
  });
}

type GeckoPool = {
  attributes: {
    name: string;
    base_token_price_usd?: string;
    market_cap_usd?: string | null;
    fdv_usd?: string;
    reserve_in_usd?: string;
    volume_usd?: { h24?: string };
    price_change_percentage?: { m5?: string; h1?: string; h24?: string };
    transactions?: { h24?: { buys?: number; sells?: number } };
    pool_created_at?: string;
    address: string;
  };
  relationships: { base_token: { data: { id: string } } };
};

/** Memecoins Solana les plus actifs du moment (classement par activité, pas de mise en avant payante). */
export function trendingRadar(): Promise<RadarToken[]> {
  return memo("radar:trending", 60_000, async () => {
    const { data } = await getJson<{ data: GeckoPool[] }>("https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1");
    return data
      .map((p): RadarToken => {
        const a = p.attributes;
        const address = p.relationships.base_token.data.id.replace(/^solana_/, "");
        const [symbol] = a.name.split(" / ");
        return {
          address,
          name: symbol,
          symbol,
          imageUrl: null,
          dexUrl: `https://www.geckoterminal.com/solana/pools/${a.address}`,
          links: [],
          priceUsd: num(a.base_token_price_usd),
          mcapUsd: num(a.market_cap_usd) ?? num(a.fdv_usd),
          liquidityUsd: num(a.reserve_in_usd),
          volume24Usd: num(a.volume_usd?.h24),
          change: { m5: num(a.price_change_percentage?.m5), h1: num(a.price_change_percentage?.h1), h24: num(a.price_change_percentage?.h24) },
          buys24: num(a.transactions?.h24?.buys),
          sells24: num(a.transactions?.h24?.sells),
          createdAt: a.pool_created_at ? Date.parse(a.pool_created_at) : null,
        };
      })
      .filter((t) => !STABLES.has(t.symbol.toUpperCase()));
  });
}

/** Fiches de plusieurs tokens en une requête (30 adresses max par appel DexScreener), dans l'ordre demandé. */
export function tokensByAddresses(addresses: string[]): Promise<RadarToken[]> {
  const list = [...new Set(addresses.filter(isSolanaAddress))].slice(0, 90);
  if (list.length === 0) return Promise.resolve([]);
  return memo(`radar:batch:${list.join(",")}`, 30_000, async () => {
    const chunks: string[][] = [];
    for (let i = 0; i < list.length; i += 30) chunks.push(list.slice(i, i + 30));
    const pairs = (await Promise.all(chunks.map((c) => getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/solana/${c.join(",")}`).catch(() => [])))).flat();
    const best = new Map<string, DexPair>();
    for (const p of pairs) {
      if (p.chainId !== "solana") continue;
      const cur = best.get(p.baseToken.address);
      if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(p.baseToken.address, p);
    }
    return list.flatMap((a) => (best.has(a) ? [fromPair(best.get(a)!)] : []));
  });
}

/** Grandes cryptos échangeables sur Solana (versions natives ou « enveloppées »). */
export const MAJORS = [
  "So11111111111111111111111111111111111111112", // SOL
  "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij", // cbBTC (Bitcoin)
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // ETH (Wormhole)
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", // WIF
  "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", // JTO
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", // PYTH
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // RAY
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
  "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", // JitoSOL
  "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", // ORCA
  "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof", // RENDER
  "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux", // HNT
  "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ", // W (Wormhole)
  "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn", // PUMP
  "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN", // TRUMP
  "FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P", // MELANIA
  "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv", // PENGU
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", // FARTCOIN
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", // POPCAT
  "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", // MEW
  "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS", // KMNO
  "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7", // DRIFT
  "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6", // TNSR
  "Grass7B4RdKfBCjTKgSqnXkqjwiGvQyFbuSCUJr3XXjs", // GRASS
  "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC", // AI16Z
];

/** Grandes cryptos, avec cours en direct. Le SOL garde son nom (DexScreener l'appelle « Wrapped SOL »). */
export async function majorsRadar(): Promise<RadarToken[]> {
  const tokens = await tokensByAddresses(MAJORS);
  // SOL en tête, puis les autres par capitalisation (comme une liste « cryptos établies »)
  const named = tokens.map((t) => (t.address === MAJORS[0] ? { ...t, name: "Solana", symbol: "SOL" } : t));
  return [named[0], ...named.slice(1).sort((a, b) => (b.mcapUsd ?? 0) - (a.mcapUsd ?? 0))].filter(Boolean);
}

/** Tendances Solana enrichies (images, liens) par une requête groupée. */
export async function trendingWithImages(): Promise<RadarToken[]> {
  const trending = await trendingRadar();
  const details = await tokensByAddresses(trending.map((t) => t.address)).catch(() => []);
  const byAddr = new Map(details.map((d) => [d.address, d]));
  return trending.map((t) => {
    const d = byAddr.get(t.address);
    return d ? { ...t, name: d.name, imageUrl: d.imageUrl, links: d.links } : t;
  });
}

/** Fiche d'un token sur n'importe quelle blockchain suivie (Solana, Robinhood, Base, BNB, Ethereum). */
export function tokenOnChain(chain: string, address: string): Promise<RadarToken | null> {
  return memo(`radar:chain:${chain}:${address.toLowerCase()}`, 30_000, async () => {
    const pairs = await getJson<DexPair[]>(`https://api.dexscreener.com/tokens/v1/${chain}/${address}`);
    const mine = pairs.filter((p) => p.chainId === chain && p.baseToken.address.toLowerCase() === address.toLowerCase());
    const best = mine.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    return best ? fromPair(best) : null;
  });
}
