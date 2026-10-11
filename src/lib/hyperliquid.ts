import "server-only";
import { memo } from "@/lib/memo";

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

/** Pictogrammes des marchés qui ne sont pas des entreprises. */
const EMOJI: Record<string, string> = {
  GOLD: "🥇", SILVER: "🥈", PLATINUM: "⚪", PALLADIUM: "🔘", COPPER: "🟤", CL: "🛢️", BRENTOIL: "🛢️", NATGAS: "🔥", HO: "⛽",
  EUR: "🇪🇺", JPY: "🇯🇵", GBP: "🇬🇧", TLT: "🏛️", USBOND: "🏛️", "10Y": "📈", "30Y": "📈", "2Y": "📈",
  XYZ100: "🇺🇸", SP500: "🇺🇸", US500: "🇺🇸", USTECH: "🇺🇸", SMALL2000: "🇺🇸", JP225: "🇯🇵", KR200: "🇰🇷", EWY: "🇰🇷", KORU: "🇰🇷",
  EWJ: "🇯🇵", EWZ: "🇧🇷", EWT: "🇹🇼", TOTAL2: "🪙", OTHERS: "🪙", BTCD: "₿", BVIV: "₿", SMH: "💾", SOXL: "💾", XLE: "⚡", XBI: "🧬",
  IGV: "💻", MAGS: "✨", URNM: "☢️", DRAM: "💾",
};
/** Sites des entreprises non cotées aux États-Unis (pré-IPO, Asie) pour leur logo. */
const DOMAIN: Record<string, string> = {
  SPCX: "spacex.com", OAI: "openai.com", ANTH: "anthropic.com", SHEIN: "shein.com", MINIMAX: "minimax.io", ZHIPU: "zhipuai.cn",
  UNITREE: "unitree.com", CXMT: "cxmt.com", OURA: "ouraring.com", KIOXIA: "kioxia.com", SKHX: "skhynix.com", SKHY: "skhynix.com",
  SMSN: "samsung.com", SOFTBANK: "softbank.jp", HYUNDAI: "hyundai.com", TCNT: "tencent.com", GIGADEV: "gigadevice.com",
  PURRDAT: "hyperliquid.xyz", ANSEM: "x.com", TREAD: "x.com",
};
function logoOf(symbol: string, category: Category): { imageUrl: string | null; emoji: string | null } {
  if (EMOJI[symbol]) return { imageUrl: null, emoji: EMOJI[symbol] };
  if (DOMAIN[symbol]) return { imageUrl: `https://www.google.com/s2/favicons?domain=${DOMAIN[symbol]}&sz=128`, emoji: null };
  if (category === "actions") return { imageUrl: `https://assets.parqet.com/logos/symbol/${encodeURIComponent(symbol)}?format=png`, emoji: null };
  return { imageUrl: null, emoji: null };
}

/** Noms lisibles et catégories (le reste est classé « actions » avec son symbole). */
const INFO: Record<string, [string, Category?]> = {
  XYZ100: ["Nasdaq 100", "indices"], SP500: ["S&P 500", "indices"], US500: ["S&P 500", "indices"], USTECH: ["Nasdaq 100", "indices"],
  SMALL2000: ["Russell 2000", "indices"], JP225: ["Nikkei 225 (Japon)", "indices"], KR200: ["KOSPI 200 (Corée)", "indices"],
  TOTAL2: ["Crypto hors Bitcoin", "indices"], OTHERS: ["Crypto hors top 10", "indices"], BTCD: ["Dominance du Bitcoin", "indices"], BVIV: ["Volatilité du Bitcoin", "indices"],
  SMH: ["ETF semi-conducteurs", "indices"], SOXL: ["ETF semi-conducteurs ×3", "indices"], XLE: ["ETF énergie", "indices"], XBI: ["ETF biotech", "indices"],
  IGV: ["ETF logiciels", "indices"], MAGS: ["ETF « 7 Magnifiques »", "indices"], EWY: ["ETF Corée du Sud", "indices"], EWJ: ["ETF Japon", "indices"],
  EWZ: ["ETF Brésil", "indices"], EWT: ["ETF Taïwan", "indices"], URNM: ["ETF uranium", "indices"], KORU: ["ETF Corée ×3", "indices"],
  GOLD: ["Or", "matieres"], SILVER: ["Argent", "matieres"], PLATINUM: ["Platine", "matieres"], PALLADIUM: ["Palladium", "matieres"], COPPER: ["Cuivre", "matieres"],
  CL: ["Pétrole WTI", "matieres"], BRENTOIL: ["Pétrole Brent", "matieres"], NATGAS: ["Gaz naturel", "matieres"], HO: ["Fioul", "matieres"],
  EUR: ["Euro / Dollar", "devises"], JPY: ["Dollar / Yen", "devises"], GBP: ["Livre / Dollar", "devises"],
  TLT: ["Obligations US 20 ans (ETF)", "taux"], USBOND: ["Obligations US", "taux"], "10Y": ["Taux US 10 ans", "taux"], "30Y": ["Taux US 30 ans", "taux"], "2Y": ["Taux US 2 ans", "taux"],
  SPCX: ["SpaceX", "pre-ipo"], OAI: ["OpenAI", "pre-ipo"], ANTH: ["Anthropic", "pre-ipo"], SHEIN: ["Shein", "pre-ipo"], MINIMAX: ["MiniMax", "pre-ipo"],
  ZHIPU: ["Zhipu AI", "pre-ipo"], UNITREE: ["Unitree Robotics", "pre-ipo"], CXMT: ["CXMT", "pre-ipo"], OURA: ["Oura", "pre-ipo"], KIOXIA: ["Kioxia"],
  TSLA: ["Tesla"], NVDA: ["Nvidia"], HOOD: ["Robinhood"], INTC: ["Intel"], PLTR: ["Palantir"], COIN: ["Coinbase"], META: ["Meta"], AAPL: ["Apple"],
  MSFT: ["Microsoft"], ORCL: ["Oracle"], GOOGL: ["Google (Alphabet)"], AMZN: ["Amazon"], AMD: ["AMD"], MU: ["Micron"], SNDK: ["SanDisk"],
  MSTR: ["Strategy (MicroStrategy)"], CRCL: ["Circle"], NFLX: ["Netflix"], COST: ["Costco"], LLY: ["Eli Lilly"], SKHX: ["SK Hynix"], SKHY: ["SK Hynix"],
  TSM: ["TSMC"], RIVN: ["Rivian"], BABA: ["Alibaba"], SMSN: ["Samsung"], USAR: ["USA Rare Earth"], CRWV: ["CoreWeave"], GME: ["GameStop"],
  SOFTBANK: ["SoftBank"], HYUNDAI: ["Hyundai"], HIMS: ["Hims & Hers"], DKNG: ["DraftKings"], LITE: ["Lumentum"], BX: ["Blackstone"],
  MRVL: ["Marvell"], RKLB: ["Rocket Lab"], DRAM: ["Mémoire DRAM"], CBRS: ["Cerebras"], ZM: ["Zoom"], EBAY: ["eBay"], ARM: ["Arm"],
  ASML: ["ASML"], BB: ["BlackBerry"], QNT: ["Quantum"], DELL: ["Dell"], IBM: ["IBM"], AVGO: ["Broadcom"], NOW: ["ServiceNow"], NBIS: ["Nebius"],
  WDC: ["Western Digital"], NOK: ["Nokia"], BE: ["Bloom Energy"], QCOM: ["Qualcomm"], AMAT: ["Applied Materials"], GEV: ["GE Vernova"],
  IREN: ["IREN"], NET: ["Cloudflare"], CRWD: ["CrowdStrike"], RDDT: ["Reddit"], AAOI: ["Applied Optoelectronics"], MRNA: ["Moderna"],
  BMNR: ["BitMine"], CVX: ["Chevron"], LRCX: ["Lam Research"], UMC: ["UMC"], TWST: ["Twist Bioscience"], GLW: ["Corning"], COHR: ["Coherent"],
  CRDO: ["Credo"], STX: ["Seagate"], VST: ["Vistra"], TER: ["Teradyne"], CIEN: ["Ciena"], MELI: ["MercadoLibre"], SMCI: ["Super Micro"],
  SOFI: ["SoFi"], TTWO: ["Take-Two"], CIFR: ["Cipher Mining"], IONQ: ["IonQ"], GPRO: ["GoPro"], TCNT: ["Tencent"], PURRDAT: ["Purr Data"],
};

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
        ...logoOf(symbol, category ?? "actions"),
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
