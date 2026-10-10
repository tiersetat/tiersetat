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

/** Couleurs de fête : chaque mème garde toujours la même, tirée de son nom. */
const FETE = [
  { bg: "#3d5afe", fg: "#ffffff" },
  { bg: "#ff3d68", fg: "#ffffff" },
  { bg: "#ffd23f", fg: "#0b0d2a" },
  { bg: "#ff7ad9", fg: "#0b0d2a" },
  { bg: "#3dffb0", fg: "#0b0d2a" },
  { bg: "#5ec8ff", fg: "#0b0d2a" },
];
export function feteColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FETE[h % FETE.length];
}

/** Carte d'un mème : grande image, pastille de couleur, capitalisation et progression vers la Bastille. */
export function TokenCard({ name, ticker, imageUrl, marketCapSol, progress, footer, className = "" }: TokenCardProps) {
  const pct = Math.max(0, Math.min(100, progress));
  const c = feteColor(ticker + name);
  return (
    <article className={`surface surface-hover flex h-full flex-col overflow-hidden ${className}`}>
      <div className="relative aspect-square overflow-hidden" style={{ background: imageUrl ? "#171b4a" : c.bg }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- images IPFS de domaines variables
          <img src={imageUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center font-[family-name:var(--font-display)] text-7xl font-extrabold" style={{ color: c.fg }}>
            {ticker.slice(0, 1) || "?"}
          </div>
        )}
        <span
          className="absolute left-2.5 top-2.5 -rotate-2 rounded-xl px-2.5 py-1 font-mono text-[12px] font-bold shadow-[0_3px_0_-1px_rgb(0_0_0/0.35)]"
          style={imageUrl ? { background: c.bg, color: c.fg } : { background: c.fg, color: c.bg }}
        >
          ${ticker}
        </span>
        {pct >= 100 && <span className="absolute right-2.5 top-2.5 rotate-2 rounded-xl bg-achat px-2.5 py-1 text-[11px] font-extrabold text-nuit">Bastille prise 🏰</span>}
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
            <div className="progress-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
        </div>
        {footer}
      </div>
    </article>
  );
}
