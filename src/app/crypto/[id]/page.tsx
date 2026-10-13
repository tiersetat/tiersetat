import type { Metadata } from "next";
import Link from "next/link";
import { LiveActivity } from "@/components/social/LiveActivity";
import { notFound } from "next/navigation";
import { memo } from "@/lib/memo";
import { pct, usd } from "@/lib/market-format";
import { BuyPanel } from "@/components/market/BuyPanel";
import { ChartPanel } from "@/components/market/ChartPanel";
import { tvForCrypto } from "@/lib/tradingview";

/** Cryptos qui ont un marché sur Hyperliquid : on peut alors afficher leurs bougies en direct. */
function hyperliquidCoins(): Promise<Set<string>> {
  return memo("hl:coins", 3_600_000, async () => {
    const res = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "meta" }), signal: AbortSignal.timeout(7000) });
    const meta = (await res.json()) as { universe: { name: string; isDelisted?: boolean }[] };
    return new Set(meta.universe.filter((u) => !u.isDelisted).map((u) => u.name));
  });
}

/** Paires en dollars (USDT) cotées sur Binance et leur dernier prix : bougies en direct pour les cryptos absentes d'Hyperliquid. */
function binancePairs(): Promise<Map<string, number>> {
  return memo("binance:usdt", 600_000, async () => {
    const res = await fetch("https://data-api.binance.vision/api/v3/ticker/price", { signal: AbortSignal.timeout(7000) });
    const list = (await res.json()) as { symbol: string; price: string }[];
    return new Map(list.filter((x) => x.symbol.endsWith("USDT")).map((x) => [x.symbol, Number(x.price)]));
  });
}

/** La paire Binance de cette crypto, seulement si son prix colle (±10 %) : un symbole partagé par deux cryptos ne trompe pas le graphique. */
function binanceSymbol(pairs: Map<string, number>, symbol: string, priceUsd: number | null): string | null {
  const s = `${symbol.toUpperCase()}USDT`;
  const p = pairs.get(s);
  if (!p || !priceUsd) return null;
  return Math.abs(p - priceUsd) / priceUsd < 0.1 ? s : null;
}

type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: { large: string };
  description?: { en?: string };
  market_cap_rank: number | null;
  market_data: {
    current_price: { usd: number | null };
    market_cap: { usd: number | null };
    total_volume: { usd: number | null };
    price_change_percentage_24h: number | null;
    price_change_percentage_7d: number | null;
    high_24h: { usd: number | null };
    low_24h: { usd: number | null };
    ath: { usd: number | null };
    sparkline_7d?: { price: number[] };
  };
};

function loadCoin(id: string): Promise<Coin | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return Promise.resolve(null);
  return memo(`coin:${id}`, 120_000, async () => {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`,
      { signal: AbortSignal.timeout(7000) },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    return (await res.json()) as Coin;
  });
}

export async function generateMetadata({ params }: PageProps<"/crypto/[id]">): Promise<Metadata> {
  const c = await loadCoin((await params).id).catch(() => null);
  return { title: c ? `${c.symbol.toUpperCase()} — ${usd(c.market_data.current_price.usd)} — Tiers-État` : "Crypto — Tiers-État" };
}

export default async function CryptoPage({ params }: PageProps<"/crypto/[id]">) {
  const { id } = await params;
  let coin: Coin | null = null;
  try {
    coin = await loadCoin(id);
  } catch {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-surface p-8 text-center">
        <p className="font-bold">Cours momentanément indisponible</p>
        <Link href="/?tri=cryptos" className="btn-ghost mt-4">
          Retour aux cryptos
        </Link>
      </div>
    );
  }
  if (!coin) notFound();
  const m = coin.market_data;
  const hl = await hyperliquidCoins().catch(() => new Set<string>());
  const hlCoin = hl.has(coin.symbol.toUpperCase()) ? coin.symbol.toUpperCase() : null;
  const bnSymbol = hlCoin ? null : binanceSymbol(await binancePairs().catch(() => new Map<string, number>()), coin.symbol, m.current_price.usd);
  const up = (m.price_change_percentage_24h ?? 0) >= 0;
  const stats: [string, string][] = [
    ["Capitalisation", usd(m.market_cap.usd)],
    ["Vol. 24 h", usd(m.total_volume.usd)],
    ["Plus haut 24 h", usd(m.high_24h.usd)],
    ["Plus bas 24 h", usd(m.low_24h.usd)],
    ["Variation 7 j", pct(m.price_change_percentage_7d)],
    ["Record historique", usd(m.ath.usd)],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] xl:grid-cols-1 min-[1800px]:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-5">
        <header className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo CoinGecko */}
          <img src={coin.image.large} alt="" className="size-16 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-extrabold">{coin.symbol.toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">
              {coin.name}
              {coin.market_cap_rank ? ` · n° ${coin.market_cap_rank} mondial` : ""}
            </p>
          </div>
        </header>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="font-[family-name:var(--font-display)] text-5xl font-extrabold">{usd(m.current_price.usd)}</p>
          <p className={`pb-1.5 font-mono text-lg font-bold ${up ? "text-achat" : "text-vente"}`}>{pct(m.price_change_percentage_24h)} 24 h</p>
        </div>
        <ChartPanel
          source={hlCoin ? { kind: "hyperliquid", coin: hlCoin } : bnSymbol ? { kind: "binance", symbol: bnSymbol } : { kind: "coingecko", id: coin.id }}
          tvSymbol={tvForCrypto(coin.symbol)}
        />
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-white/[0.08]">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-mono font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">Données CoinGecko, pour information : ce n&apos;est pas une recommandation d&apos;achat.</p>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <BuyPanel symbol={coin.symbol.toUpperCase()} />
        <div className="space-y-2 xl:hidden">
          <h2 className="px-1 text-lg font-extrabold">Ce que le monde achète</h2>
          <LiveActivity limit={6} />
        </div>
      </aside>
    </div>
  );
}
