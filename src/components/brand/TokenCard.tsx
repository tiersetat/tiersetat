import { Eur } from "@/components/Eur";

export type TokenCardProps = {
  name: string;
  ticker: string;
  imageUrl?: string;
  /** Market cap en SOL */
  marketCapSol?: number;
  /** Progression de la bonding curve, 0–100 */
  progress: number;
  footer?: React.ReactNode;
  className?: string;
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: n < 10 ? 2 : 1 });

/** Carte d'un mème (Tiers-État 2.0) : grande image, nom, capitalisation et progression vers la Bastille. */
export function TokenCard({ name, ticker, imageUrl, marketCapSol, progress, footer, className = "" }: TokenCardProps) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <article className={`surface surface-hover flex h-full flex-col overflow-hidden ${className}`}>
      <div className="relative aspect-square overflow-hidden bg-white/[0.03]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- images IPFS de domaines variables
          <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center text-5xl font-bold text-muted-foreground/40">{ticker.slice(0, 1) || "?"}</div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] font-semibold text-lueur backdrop-blur">${ticker}</span>
        {pct >= 100 && <span className="absolute right-2.5 top-2.5 rounded-full bg-achat/90 px-2.5 py-1 text-[11px] font-bold text-nuit">Bastille 🏰</span>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3.5 sm:p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold tracking-tight">{name}</h3>
          <p className="mt-1 font-mono text-lg font-bold leading-none">{marketCapSol === undefined ? "—" : `${fmt(marketCapSol)} SOL`}</p>
          {marketCapSol !== undefined && <Eur sol={marketCapSol} className="text-[11px] text-muted-foreground/80" />}
        </div>
        <div className="mt-auto space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Vers la Bastille</span>
            <span className="font-mono font-semibold text-foreground">{pct.toFixed(0)} %</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression de la bonding curve">
            <div className="progress-fill" style={{ width: `${Math.max(pct, 1.5)}%` }} />
          </div>
        </div>
        {footer}
      </div>
    </article>
  );
}
