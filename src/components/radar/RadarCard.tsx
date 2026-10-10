import { CopyAddress } from "@/components/radar/CopyAddress";
import type { RadarToken } from "@/lib/radar";
import { age, alertes, pct, usd } from "@/lib/radar-utils";

const tone = (n: number | null) => (n === null ? "text-muted-foreground" : n >= 0 ? "text-achat" : "text-vente");

/** Fiche d'un memecoin, façon bot Rick : l'essentiel en un coup d'œil, avec les signaux d'alerte. */
export function RadarCard({ t }: { t: RadarToken }) {
  const warnings = alertes(t);
  const stats: [string, string][] = [
    ["Prix", usd(t.priceUsd)],
    ["Capitalisation", usd(t.mcapUsd)],
    ["Liquidité", usd(t.liquidityUsd)],
    ["Volume 24 h", usd(t.volume24Usd)],
    ["Achats / ventes 24 h", t.buys24 === null ? "—" : `${t.buys24.toLocaleString("fr-FR")} / ${(t.sells24 ?? 0).toLocaleString("fr-FR")}`],
    ["Âge", age(t.createdAt)],
  ];
  return (
    <article className="surface space-y-5 p-5 sm:p-6">
      <header className="flex items-center gap-4">
        {t.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- image fournie par DexScreener
          <img src={t.imageUrl} alt="" width={56} height={56} referrerPolicy="no-referrer" className="size-14 rounded-2xl object-cover" />
        ) : (
          <div className="grid size-14 place-items-center rounded-2xl bg-white/5 font-mono text-xl text-pervenche">{t.symbol.slice(0, 1)}</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{t.name}</p>
          <p className="font-mono text-sm text-pervenche">${t.symbol}</p>
        </div>
        <CopyAddress address={t.address} />
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["m5", "h1", "h24"] as const).map((k) => (
          <span key={k} className="rounded-lg bg-white/[0.04] px-2.5 py-1">
            <span className="text-muted-foreground">{k === "m5" ? "5 min" : k === "h1" ? "1 h" : "24 h"} </span>
            <span className={`font-mono font-medium ${tone(t.change[k])}`}>{pct(t.change[k])}</span>
          </span>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-mono">{value}</dd>
          </div>
        ))}
      </dl>

      {warnings.length > 0 && (
        <ul className="space-y-1.5">
          {warnings.map((w) => (
            <li key={w.texte} className={`rounded-lg px-3 py-1.5 text-xs ${w.niveau === "danger" ? "bg-vente/10 text-vente" : "bg-soleil/10 text-soleil"}`}>
              ⚠ {w.texte}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        <a href={t.dexUrl} target="_blank" rel="noreferrer" className="chip">
          Graphique ↗
        </a>
        <a href={`https://solscan.io/token/${t.address}`} target="_blank" rel="noreferrer" className="chip">
          Solscan ↗
        </a>
        {t.links.slice(0, 4).map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer nofollow" className="chip">
            {l.label} ↗
          </a>
        ))}
      </div>
    </article>
  );
}
