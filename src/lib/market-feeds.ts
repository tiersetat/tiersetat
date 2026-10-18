import "server-only";
import { memo } from "@/lib/memo";
import type { MarketItem } from "@/components/market/MarketRow";
import { exclusionReason, looksFrench, passesChecks } from "@/lib/french-memes";

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
  dexId: string;
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

export type TrendItem = MarketItem & { chain: ChainId; paid: boolean; volume6h: number; createdAt: number | null; dexId: string; bonding: boolean };

/** Plateformes où un token est encore sur sa courbe de lancement (pas encore migré vers un vrai marché). */
const BONDING_DEX = new Set(["pumpfun", "launchlab", "moonshot", "meteoradbc", "boop", "believe", "bonkfun", "letsbonk", "fourmeme", "clanker", "zora"]);

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
          dexId: p.dexId,
          bonding: BONDING_DEX.has(p.dexId),
          href: `/marche/${p.baseToken.address}?c=${p.chainId}`,
        };
      })
      .sort((a, b) => b.volume6h - a.volume6h)
      .slice(0, 100);
  });
}

/** `paidAt` = moment où Tiers-État a vu le « DEX payé » ; `early` = déjà présent au démarrage du serveur (heure exacte inconnue). */
export type PaidItem = MarketItem & { chain: ChainId; paidAt: number; early: boolean; dexId: string | null; bonding: boolean; liquidityUsd: number | null };

/** Mémoire des derniers « DEX payé » vus (le flux public ne renvoie que les 30 derniers). */
const paidSeen = new Map<string, { chain: ChainId; address: string; paidAt: number; early: boolean; order: number; icon: string | null; description: string | null }>();
let paidSeq = 0;

/**
 * Les tokens qui viennent de payer leur profil DexScreener (« DEX payé »), du plus récent au plus ancien,
 * sur nos blockchains. Le flux ne donne pas l'heure du paiement : on note le moment où on le voit apparaître.
 * Prix et capitalisation de leur meilleure paire. Cache 10 s.
 */
export function dexPaidLatest(): Promise<PaidItem[]> {
  return memo("feeds:dexpaid-latest", 10_000, async () => {
    type Profile = { chainId: string; tokenAddress: string; icon?: string; openGraph?: string; description?: string };
    const latest = await getJson<Profile[]>("https://api.dexscreener.com/token-profiles/latest/v1");
    const now = Date.now();
    const firstRun = paidSeen.size === 0;
    // Le flux va du plus récent au plus ancien : on numérote pour garder cet ordre
    [...latest].reverse().forEach((p) => {
      if (!isChain(p.chainId)) return;
      const key = `${p.chainId}:${p.tokenAddress.toLowerCase()}`;
      if (paidSeen.has(key)) return;
      paidSeen.set(key, { chain: p.chainId, address: p.tokenAddress, paidAt: now, early: firstRun, order: ++paidSeq, icon: p.icon ?? null, description: p.description ?? null });
    });
    // On garde les 120 derniers
    const kept = [...paidSeen.entries()].sort((a, b) => b[1].order - a[1].order).slice(0, 120);
    paidSeen.clear();
    kept.forEach(([k, v]) => paidSeen.set(k, v));

    const byChain = new Map<ChainId, string[]>();
    for (const [, v] of kept) byChain.set(v.chain, [...(byChain.get(v.chain) ?? []), v.address]);
    const pairs = await bestPairs(byChain).catch(() => [] as DexPair[]);
    const pairOf = new Map(pairs.map((p) => [`${p.chainId}:${p.baseToken.address.toLowerCase()}`, p]));
    return kept.map(([key, v]): PaidItem => {
      const p = pairOf.get(key);
      return {
        address: v.address,
        name: p?.baseToken.name ?? v.description?.slice(0, 32) ?? "Token",
        symbol: p?.baseToken.symbol ?? "?",
        imageUrl: p?.info?.imageUrl ?? v.icon,
        priceUsd: num(p?.priceUsd),
        mcapUsd: num(p?.marketCap ?? p?.fdv),
        change24: num(p?.priceChange?.h24),
        chain: v.chain,
        paid: true,
        paidAt: v.paidAt,
        early: v.early,
        dexId: p?.dexId ?? null,
        bonding: p ? BONDING_DEX.has(p.dexId) : false,
        liquidityUsd: num(p?.liquidity?.usd),
        href: `/marche/${v.address}?c=${v.chain}`,
      };
    });
  });
}

/** Stablecoins exclus de la liste des cryptos (leur cours ne bouge pas). */
const STABLES = new Set(["usdt", "usdc", "dai", "fdusd", "usde", "usds", "pyusd", "tusd", "usd1", "rlusd", "usdd", "gusd", "usdp", "frax", "lusd", "susd", "usdy", "usd0", "bfusd", "usdtb", "susde", "eurc"]);

type CgCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price?: number[] };
};

/** Courbe 7 jours réduite à ~28 points (assez pour une mini-courbe, léger à transmettre). */
function thin(prices: number[] | undefined): number[] | undefined {
  if (!prices?.length) return undefined;
  const step = Math.max(1, Math.floor(prices.length / 28));
  const out = prices.filter((_, i) => i % step === 0);
  if (out.at(-1) !== prices.at(-1)) out.push(prices.at(-1)!);
  return out;
}

/** Les grandes cryptos du monde (classement CoinGecko par capitalisation), sans les stablecoins. */
export function topCryptos(): Promise<MarketItem[]> {
  return memo("feeds:cryptos", 300_000, async () => {
    const coins = await getJson<CgCoin[]>("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&price_change_percentage=24h&sparkline=true");
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
        sparkline: thin(c.sparkline_in_7d?.price),
        href: `/crypto/${c.id}`,
      }));
  });
}

export type FrenchItem = MarketItem & { chain: "solana"; holders: number; liquidityUsd: number | null };

/** Recherches DexScreener qui font remonter les mèmes à thème français. */
const FR_QUERIES = ["france", "french", "francais", "paris", "baguette", "croissant", "fromage", "gaulois", "cocorico", "marseille"];
/** Mémoire des mèmes français déjà repérés (la liste s'enrichit au fil des heures). */
const frSeen = new Map<string, { description: string | null }>();
/** Dernière fiche Jupiter de chaque candidat (détenteurs, créateur). */
const frInfo = new Map<string, { at: number; j: { id: string; name: string; symbol: string; icon?: string; holderCount?: number; audit?: { devMints?: number } } }>();
let frTurn = 0;

/**
 * Mèmes français repérés automatiquement sur Solana (profils DexScreener récents et recherches par thème),
 * gardés seulement s'ils passent les garde-fous : pas de politique, d'insulte ni de drame,
 * créateur qui n'est pas un lanceur en série, au moins 100 détenteurs. Triés par capitalisation. Cache 2 min.
 */
export function frenchMemes(): Promise<FrenchItem[]> {
  return memo("feeds:french", 120_000, async () => {
    type Listed = { chainId: string; tokenAddress: string; description?: string; links?: { url: string }[] };
    const [lists, searches] = await Promise.all([
      Promise.all(["token-profiles/latest/v1", "token-boosts/latest/v1", "token-boosts/top/v1"].map((p) => getJson<Listed[]>(`https://api.dexscreener.com/${p}`).catch(() => [] as Listed[]))),
      Promise.all(FR_QUERIES.map((q) => getJson<{ pairs?: DexPair[] }>(`https://api.dexscreener.com/latest/dex/search?q=${q}`).catch(() => ({ pairs: [] as DexPair[] })))),
    ]);
    // Candidats : profils écrits en français ou à thème français, et résultats de recherche à thème français
    for (const t of lists.flat()) {
      if (t.chainId !== "solana") continue;
      const links = (t.links ?? []).map((l) => l.url);
      if (looksFrench({ name: "", symbol: "", description: t.description, links }) && !exclusionReason({ name: "", symbol: "", description: t.description })) frSeen.set(t.tokenAddress, { description: t.description ?? null });
    }
    for (const p of searches.flatMap((s) => s.pairs ?? [])) {
      if (p.chainId !== "solana") continue;
      if (looksFrench(p.baseToken) && !exclusionReason(p.baseToken)) frSeen.set(p.baseToken.address, frSeen.get(p.baseToken.address) ?? { description: null });
    }
    // Recherche par mot-clé chez Jupiter : quota serré (~5 requêtes par fenêtre), donc 2 mots par passage, à tour de rôle
    type Jup = { id: string; name: string; symbol: string; icon?: string; holderCount?: number; audit?: { devMints?: number } };
    const now = Date.now();
    for (let k = 0; k < 2; k++) {
      const q = FR_QUERIES[frTurn++ % FR_QUERIES.length];
      const hits = await getJson<Jup[]>(`https://lite-api.jup.ag/tokens/v2/search?query=${q}`).catch(() => [] as Jup[]);
      for (const h of hits) {
        if (!looksFrench(h) || exclusionReason(h)) continue;
        frSeen.set(h.id, frSeen.get(h.id) ?? { description: null });
        frInfo.set(h.id, { at: now, j: h });
      }
    }
    while (frSeen.size > 400) frSeen.delete(frSeen.keys().next().value!);

    // Créateur et détenteurs : relus toutes les 30 min au plus, un seul lot de 100 par passage
    const stale = [...frSeen.keys()].filter((m) => now - (frInfo.get(m)?.at ?? 0) > 30 * 60_000).slice(0, 100);
    if (stale.length) {
      const got = await getJson<Jup[]>(`https://lite-api.jup.ag/tokens/v2/search?query=${stale.join(",")}`).catch(() => null);
      for (const j of got ?? []) frInfo.set(j.id, { at: now, j });
    }
    const ok = [...frSeen.keys()]
      .map((m) => frInfo.get(m)?.j)
      .filter((j): j is Jup => !!j)
      .filter((j) => passesChecks({ holders: j.holderCount ?? null, devMints: j.audit?.devMints ?? null }) && !exclusionReason({ name: j.name, symbol: j.symbol, description: frSeen.get(j.id)?.description }));
    const pairs = await bestPairs(new Map([["solana" as ChainId, ok.map((j) => j.id)]])).catch(() => [] as DexPair[]);
    const pairOf = new Map(pairs.map((p) => [p.baseToken.address, p]));
    return ok
      .map((j): FrenchItem => {
        const p = pairOf.get(j.id);
        return {
          address: j.id,
          name: j.name,
          symbol: j.symbol,
          imageUrl: p?.info?.imageUrl ?? j.icon ?? null,
          priceUsd: num(p?.priceUsd),
          mcapUsd: num(p?.marketCap ?? p?.fdv),
          change24: num(p?.priceChange?.h24),
          chain: "solana",
          holders: j.holderCount ?? 0,
          liquidityUsd: num(p?.liquidity?.usd),
          href: `/marche/${j.id}?c=solana`,
        };
      })
      .filter((t) => (t.liquidityUsd ?? 0) >= 2_000)
      .sort((a, b) => (b.mcapUsd ?? 0) - (a.mcapUsd ?? 0))
      .slice(0, 60);
  });
}
