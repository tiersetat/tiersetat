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
