import Link from "next/link";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";
import type { TraderRow } from "@/lib/leaderboards";

/**
 * Classement de la semaine par activité (nombre d'échanges), et non par gains :
 * mettre en avant des gains pousserait à la spéculation (communication sur les crypto-actifs encadrée par MiCA).
 */
export function ActivityLeaderboard({ rows }: { rows: TraderRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-white/[0.08]">
        <p className="font-bold">Le classement démarre au premier échange</p>
        <p className="mt-1 text-sm text-muted-foreground">Les membres les plus actifs de la semaine apparaîtront ici. Remise à zéro chaque lundi.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <ol className="overflow-hidden rounded-3xl bg-surface ring-1 ring-white/[0.08]">
        {rows.map((r, i) => (
          <li key={r.wallet} className="border-b border-white/[0.06] last:border-0">
            <Link href={`/profil/${r.wallet}`} className="flex items-center gap-3 px-4 py-3.5 transition active:bg-white/[0.05]">
              <span className="w-7 shrink-0 text-center text-lg font-extrabold text-muted-foreground">{i + 1}.</span>
              <Avatar wallet={r.wallet} pseudo={r.pseudo} url={r.avatar_url} size={44} />
              <span className="min-w-0 flex-1 truncate text-[16px] font-bold">{displayName(r)}</span>
              <span className="shrink-0 font-mono text-[15px] font-bold text-muted-foreground">
                {r.trades_count.toLocaleString("fr-FR")} échange{r.trades_count > 1 ? "s" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="px-1 text-xs text-muted-foreground">Classés par nombre d&apos;échanges de la semaine, pas par gains. Remise à zéro chaque lundi.</p>
    </div>
  );
}
