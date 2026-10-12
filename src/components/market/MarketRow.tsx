import Link from "next/link";
import { TokenLogo } from "./TokenLogo";
import { LiveRowValues } from "./LiveValues";

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
  /** Pictogramme (indices, matières premières, devises) quand il n'y a pas de logo */
  emoji?: string | null;
  /** Effet de levier maximal (contrats perpétuels Hyperliquid) */
  leverage?: number;
  /** Mème lancé sur Tiers-État : lien vers sa page complète */
  href?: string;
  /** Prix des 7 derniers jours (mini-courbe), quand la source le fournit */
  sparkline?: number[];
};

/** Ligne compacte d'une liste de tokens : image, nom, prix, capitalisation, variation 24 h. */
export function MarketRow({ t, rank }: { t: MarketItem; rank?: number }) {
  return (
    <li>
      <Link
        href={t.href ?? `/marche/${t.address}`}
        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/[0.05] active:scale-[0.99]"
      >
        {rank !== undefined && <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">{rank}</span>}
        <TokenLogo src={t.imageUrl} emoji={t.emoji} symbol={t.symbol} name={t.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{t.symbol}</p>
          <p className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-muted-foreground">
            {t.chain && CHAIN_DOT[t.chain] && (
              <span className="inline-flex shrink-0 items-center gap-1 font-bold">
                <span className="size-1.5 rounded-full" style={{ background: CHAIN_DOT[t.chain].color }} />
                {CHAIN_DOT[t.chain].label}
              </span>
            )}
            {t.leverage && <span className="shrink-0 rounded bg-soleil/20 px-1 font-bold text-soleil">×{t.leverage}</span>}
            {t.paid && <span className="shrink-0 rounded bg-electrique/20 px-1 font-bold text-[#8fa2ff]">DEX payé</span>}
            <span className="truncate">{t.name}</span>
          </p>
        </div>
        <LiveRowValues t={t} />
      </Link>
    </li>
  );
}
