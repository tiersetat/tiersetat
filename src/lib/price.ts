import "server-only";

let cache: { solEur: number; at: number } | null = null;
const TTL_MS = 60_000;

async function fromCoinGecko(): Promise<number> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=eur", { signal: AbortSignal.timeout(5000) });
  const json = (await res.json()) as { solana?: { eur?: number } };
  if (!res.ok || !json.solana?.eur) throw new Error("coingecko");
  return json.solana.eur;
}

async function fromKraken(): Promise<number> {
  const res = await fetch("https://api.kraken.com/0/public/Ticker?pair=SOLEUR", { signal: AbortSignal.timeout(5000) });
  const json = (await res.json()) as { result?: Record<string, { c: [string] }> };
  const pair = json.result && Object.values(json.result)[0];
  if (!res.ok || !pair) throw new Error("kraken");
  return Number(pair.c[0]);
}

/** Cours SOL/EUR (CoinGecko, Kraken en secours), mis en cache 1 minute. */
export async function getSolEur(): Promise<number | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.solEur;
  for (const source of [fromCoinGecko, fromKraken]) {
    try {
      const solEur = await source();
      if (solEur > 0) {
        cache = { solEur, at: Date.now() };
        return solEur;
      }
    } catch {
      /* source suivante */
    }
  }
  return cache?.solEur ?? null;
}

let usdCache: { usdEur: number; at: number } | null = null;

/** Valeur d'un dollar en euros (pour afficher le cash USDC en euros), mise en cache 1 minute. */
export async function getUsdEur(): Promise<number | null> {
  if (usdCache && Date.now() - usdCache.at < TTL_MS) return usdCache.usdEur;
  const sources = [
    async () => {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=eur", { signal: AbortSignal.timeout(5000) });
      const json = (await res.json()) as { "usd-coin"?: { eur?: number } };
      if (!res.ok || !json["usd-coin"]?.eur) throw new Error("coingecko");
      return json["usd-coin"].eur;
    },
    async () => {
      const res = await fetch("https://api.kraken.com/0/public/Ticker?pair=EURUSD", { signal: AbortSignal.timeout(5000) });
      const json = (await res.json()) as { result?: Record<string, { c: [string] }> };
      const pair = json.result && Object.values(json.result)[0];
      if (!res.ok || !pair) throw new Error("kraken");
      return 1 / Number(pair.c[0]);
    },
  ];
  for (const source of sources) {
    try {
      const usdEur = await source();
      if (usdEur > 0) {
        usdCache = { usdEur, at: Date.now() };
        return usdEur;
      }
    } catch {
      /* source suivante */
    }
  }
  return usdCache?.usdEur ?? null;
}
