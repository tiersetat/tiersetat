import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hyperliquidMarket } from "@/lib/hyperliquid";
import { pct, usd } from "@/lib/market-format";
import { PerpPanel } from "@/components/market/PerpPanel";
import { WatchStar } from "@/components/market/WatchStar";
import { TokenLogo } from "@/components/market/TokenLogo";

const CAT: Record<string, string> = { actions: "Action", indices: "Indice / ETF", matieres: "Matière première", devises: "Devise", "pre-ipo": "Pré-IPO", taux: "Taux d'intérêt" };

async function candles(id: string): Promise<number[]> {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "candleSnapshot", req: { coin: id, interval: "1h", startTime: Date.now() - 7 * 86_400_000, endTime: Date.now() } }),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(7000),
    });
    const list = (await res.json()) as { c: string }[];
    return list.map((c) => Number(c.c)).filter((n) => n > 0);
  } catch {
    return [];
  }
}

function Sparkline({ prices }: { prices: number[] }) {
  if (prices.length < 2) return <p className="p-6 text-center text-sm text-muted-foreground">Graphique indisponible.</p>;
  const min = Math.min(...prices), max = Math.max(...prices), W = 600, H = 220;
  const pts = prices.map((p, i) => [(i / (prices.length - 1)) * W, H - 10 - ((p - min) / (max - min || 1)) * (H - 20)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = prices[prices.length - 1] >= prices[0];
  const color = up ? "#3dffb0" : "#ff3d68";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" preserveAspectRatio="none" role="img" aria-label="Évolution du cours sur 7 jours">
      <defs>
        <linearGradient id="perp" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#perp)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export async function generateMetadata({ params }: PageProps<"/bourse/[id]">): Promise<Metadata> {
  const m = await hyperliquidMarket(decodeURIComponent((await params).id)).catch(() => null);
  return { title: m ? `${m.name} (${m.symbol}) — Tiers-État` : "Bourse — Tiers-État" };
}

/** Fiche d'un marché Hyperliquid (action, indice, matière première, devise, pré-IPO) avec effet de levier. */
export default async function BoursePage({ params }: PageProps<"/bourse/[id]">) {
  const id = decodeURIComponent((await params).id);
  const m = await hyperliquidMarket(id).catch(() => null);
  if (!m) notFound();
  const prices = await candles(m.id);
  const up = (m.change24 ?? 0) >= 0;
  const stats: [string, string][] = [
    ["Vol. 24 h", usd(m.volume24Usd)],
    ["Intérêt ouvert", usd(m.openInterestUsd)],
    ["Levier max.", `×${m.maxLeverage}`],
    ["Financement / h", m.fundingPct === null ? "—" : `${m.fundingPct.toFixed(4)} %`],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-5">
        <header className="flex items-start gap-4">
          <TokenLogo src={m.imageUrl} emoji={m.emoji} symbol={m.symbol} name={m.name} size={64} className="rounded-3xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-extrabold">{m.name}</h1>
            <p className="text-sm text-muted-foreground">
              {m.symbol} · {CAT[m.category]} · <span className="font-bold text-soleil">jusqu&apos;à ×{m.maxLeverage}</span>
            </p>
          </div>
          <WatchStar address={m.id} />
        </header>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="font-[family-name:var(--font-display)] text-5xl font-extrabold">{usd(m.priceUsd)}</p>
          <p className={`pb-1.5 font-mono text-lg font-bold ${up ? "text-achat" : "text-vente"}`}>{pct(m.change24)} 24 h</p>
        </div>
        <div className="rounded-3xl bg-surface p-3 ring-1 ring-white/[0.08]">
          <Sparkline prices={prices} />
          <p className="px-2 text-xs text-muted-foreground">7 derniers jours</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface px-4 py-3 ring-1 ring-white/[0.08]">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-mono font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Contrat perpétuel sur Hyperliquid : tu ne possèdes pas l&apos;action, tu prends une position sur son prix. Avec l&apos;effet de levier, les gains et les pertes sont multipliés, et ta position peut être liquidée.{" "}
          <Link href="/?tri=bourse" className="font-bold text-electrique">
            Tous les marchés →
          </Link>
        </p>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <PerpPanel symbol={m.symbol} maxLeverage={m.maxLeverage} />
      </aside>
    </div>
  );
}
