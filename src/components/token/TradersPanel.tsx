import Link from "next/link";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";
import { usd } from "@/lib/market-format";
import { holdLabel, type TraderPosition } from "@/lib/traders";

type Profile = { pseudo: string | null; avatar_url: string | null };

/** Traders d'un mème : position, gain ou perte, entrée moyenne, durée de détention et dernière thèse. */
export function TradersPanel({
  rows,
  profiles,
  theses,
  solUsd,
  creator,
}: {
  rows: TraderPosition[];
  profiles: Record<string, Profile>;
  theses: Record<string, string>;
  solUsd: number | null;
  creator: string;
}) {
  const $ = (sol: number | null) => (sol === null || solUsd === null ? "—" : usd(sol * solUsd));
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-extrabold">Traders</h2>
        <p className="text-xs text-muted-foreground">{rows.length} au total · gains et pertes au prix actuel</p>
      </div>
      <ul className="surface divide-y divide-ligne/60">
        {rows.slice(0, 40).map((r) => {
          const p = profiles[r.wallet];
          const up = r.pnlSol >= 0;
          return (
            <li key={r.wallet} className="space-y-2 p-4">
              <div className="flex items-start gap-3">
                <Link href={`/profil/${r.wallet}`} className="shrink-0">
                  <Avatar wallet={r.wallet} pseudo={p?.pseudo} url={p?.avatar_url} size={38} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profil/${r.wallet}`} className="flex items-center gap-2 font-bold">
                    <span className="truncate">{displayName({ wallet: r.wallet, pseudo: p?.pseudo })}</span>
                    {r.wallet === creator && <span className="shrink-0 rounded-full bg-bonbon/20 px-2 py-0.5 text-[10px] font-extrabold text-bonbon">Créateur</span>}
                  </Link>
                  <p className="text-xs text-muted-foreground">Détention : {holdLabel(r.holdMs)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono font-bold">{r.closed ? "Soldée" : $(r.valueSol)}</p>
                  <p className={`font-mono text-xs font-bold ${up ? "text-achat" : "text-vente"}`}>
                    {up ? "+" : "−"}
                    {$(Math.abs(r.pnlSol))}
                    {r.pnlPct !== null && ` (${up ? "▲" : "▼"} ${Math.abs(r.pnlPct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %)`}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pl-[50px] text-xs text-muted-foreground">
                <span>Entrée moy. : {$(r.avgEntryMcapSol)} de cap.</span>
              </div>
              {theses[r.wallet] && <p className="ml-[50px] rounded-2xl bg-white/[0.05] px-3 py-2 text-sm text-foreground">« {theses[r.wallet]} »</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
