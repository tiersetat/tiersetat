import Link from "next/link";
import { feteColor } from "@/components/brand/TokenCard";
import { pct, usd } from "@/lib/market-format";

const CHAIN_DOT: Record<string, { label: string; color: string }> = {
  solana: { label: "SOL", color: "#9945ff" },
  robinhood: { label: "HOOD", color: "#ccff00" },
  base: { label: "BASE", color: "#0052ff" },
  bsc: { label: "BNB", color: "#f3ba2f" },
  ethereum: { label: "ETH", color: "#8a92b2" },
};

export type MarketItem = {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number | null;
  mcapUsd: number | null;
  change24: number | null;
  /** Mème Tiers-État encore sur sa courbe : progression vers la Bastille (0–100), affichée à la place de la variation */
  progress?: number;
  /** Blockchain (pastille de couleur) et badge « DEX payé » pour les listes multi-chaînes */
  chain?: string;
  paid?: boolean;
  /** Mème lancé sur Tiers-État : lien vers sa page complète */
  href?: string;
};

/** Ligne compacte d'une liste de tokens : image, nom, prix, capitalisation, variation 24 h. */
export function MarketRow({ t, rank }: { t: MarketItem; rank?: number }) {
  const c = feteColor(t.symbol + t.name);
  const up = (t.change24 ?? 0) >= 0;
  return (
    <li>
      <Link
        href={t.href ?? `/marche/${t.address}`}
        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/[0.05] active:scale-[0.99]"
      >
        {rank !== undefined && <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">{rank}</span>}
        {t.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- images de domaines variables
          <img src={t.imageUrl} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-2xl bg-muted object-cover" />
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold" style={{ background: c.bg, color: c.fg }}>
            {t.symbol.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{t.symbol}</p>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {t.chain && CHAIN_DOT[t.chain] && (
              <span className="inline-flex shrink-0 items-center gap-1 font-bold">
                <span className="size-1.5 rounded-full" style={{ background: CHAIN_DOT[t.chain].color }} />
                {CHAIN_DOT[t.chain].label}
              </span>
            )}
            {t.paid && <span className="shrink-0 rounded bg-electrique/20 px-1 font-bold text-[#8fa2ff]">DEX payé</span>}
            <span className="truncate">{t.name}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-bold">{usd(t.priceUsd)}</p>
          {t.mcapUsd !== null && <p className="font-mono text-xs text-muted-foreground">{usd(t.mcapUsd)} cap.</p>}
        </div>
        {t.progress !== undefined ? (
          <span className="w-[5.5rem] shrink-0 rounded-xl bg-soleil/15 px-2 py-1.5 text-center font-mono text-xs font-bold text-soleil" title="Progression vers la Bastille">
            🏰 {Math.round(t.progress)} %
          </span>
        ) : (
          <span
            className={`w-[5.5rem] shrink-0 rounded-xl px-2 py-1.5 text-center font-mono text-xs font-bold ${t.change24 === null ? "bg-white/[0.06] text-muted-foreground" : up ? "bg-achat/15 text-achat" : "bg-vente/15 text-vente"}`}
          >
            {pct(t.change24)}
          </span>
        )}
      </Link>
    </li>
  );
}
