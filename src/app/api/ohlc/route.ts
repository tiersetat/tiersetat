import { NextResponse } from "next/server";
import { memo } from "@/lib/memo";

/**
 * Relais des bougies des memecoins (GeckoTerminal) et des cryptos (CoinGecko) avec cache partagé :
 * tous les utilisateurs profitent de la même réponse, ce qui évite les limites de requêtes de ces services gratuits.
 */
const GECKO_TF: Record<string, [string, number]> = { "1m": ["minute", 1], "5m": ["minute", 5], "15m": ["minute", 15], "1h": ["hour", 1], "4h": ["hour", 4], "1d": ["day", 1] };
const CG_DAYS: Record<string, number> = { "15m": 1, "4h": 30, "1d": 365 };
const SAFE = /^[A-Za-z0-9_-]{1,80}$/;

async function upstream(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const src = q.get("src");
  const i = q.get("i") ?? "15m";
  try {
    if (src === "gecko") {
      const network = q.get("network") ?? "";
      const pool = q.get("pool") ?? "";
      const tf = GECKO_TF[i];
      if (!tf || !SAFE.test(network) || !/^[A-Za-z0-9]{20,80}$/.test(pool)) return NextResponse.json({ error: "paramètres" }, { status: 400 });
      const data = await memo(`ohlc:g:${network}:${pool}:${i}`, 20_000, () =>
        upstream(`https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pool}/ohlcv/${tf[0]}?aggregate=${tf[1]}&limit=1000&currency=usd`),
      );
      return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120" } });
    }
    if (src === "coingecko") {
      const id = q.get("id") ?? "";
      const days = CG_DAYS[i];
      if (!days || !SAFE.test(id)) return NextResponse.json({ error: "paramètres" }, { status: 400 });
      const data = await memo(`ohlc:c:${id}:${i}`, 120_000, () => upstream(`https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`));
      return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
    }
    return NextResponse.json({ error: "source" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "indisponible" }, { status: 502 });
  }
}
