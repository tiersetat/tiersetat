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

/** Carte d'un token : image, nom, ticker, market cap et progression vers le DEX. */
export function TokenCard({ name, ticker, imageUrl, marketCapSol, progress, footer, className = "" }: TokenCardProps) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <article className={`surface surface-hover flex flex-col gap-4 p-4 ${className}`}>
      <div className="flex gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-ligne bg-white/[0.03]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- images IPFS de domaines variables
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-2xl font-semibold text-muted-foreground/50">{ticker.slice(0, 1) || "?"}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{name}</h3>
          <p className="font-mono text-sm text-pervenche">${ticker}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Market cap <span className="font-mono font-medium text-foreground">{marketCapSol === undefined ? "—" : `${fmt(marketCapSol)} SOL`}</span>
          </p>
          {marketCapSol !== undefined && <Eur sol={marketCapSol} className="text-[11px] text-muted-foreground/80" />}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Bonding curve</span>
          <span className="font-mono text-foreground">{pct.toFixed(0)} %</span>
        </div>
        <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression de la bonding curve">
          <div className="progress-fill" style={{ width: `${Math.max(pct, 1.5)}%` }} />
        </div>
      </div>
      {footer}
    </article>
  );
}
