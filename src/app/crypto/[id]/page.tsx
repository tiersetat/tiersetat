import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { memo } from "@/lib/memo";
import { pct, usd } from "@/lib/market-format";
import { BuyPanel } from "@/components/market/BuyPanel";

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

/** Courbe des 7 derniers jours, dessinée en SVG (aucune bibliothèque). */
function Sparkline({ prices, up }: { prices: number[]; up: boolean }) {
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const W = 600;
  const H = 220;
  const pts = prices.map((p, i) => [(i / (prices.length - 1)) * W, H - 10 - ((p - min) / (max - min || 1)) * (H - 20)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const color = up ? "#3dffb0" : "#ff3d68";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" preserveAspectRatio="none" role="img" aria-label="Évolution du cours sur 7 jours">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#spark)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="5" fill={color} />
    </svg>
  );
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
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
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
        <div className="rounded-3xl bg-surface p-3 ring-1 ring-white/[0.08]">
          <Sparkline prices={m.sparkline_7d?.price ?? []} up={(m.price_change_percentage_7d ?? 0) >= 0} />
          <p className="px-2 text-xs text-muted-foreground">7 derniers jours</p>
        </div>
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
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <BuyPanel symbol={coin.symbol.toUpperCase()} />
      </aside>
    </div>
  );
}
