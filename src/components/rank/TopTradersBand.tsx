import Link from "next/link";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";
import { topTraders } from "@/lib/leaderboards";

/** Petite bande de l'accueil : les membres les plus actifs de la semaine (par activité, jamais par gains). */
export async function TopTradersBand() {
  const rows = (await topTraders().catch(() => [])).filter((r) => r.trades_count > 0).slice(0, 12);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Membres les plus actifs" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-muted-foreground">Les plus actifs de la semaine</h2>
        <Link href="/fil?vue=classement" className="text-sm font-bold text-electrique">
          Classement →
        </Link>
      </div>
      <ul className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1">
        {rows.map((r) => (
          <li key={r.wallet} className="w-44 shrink-0 snap-start">
            <Link href={`/profil/${r.wallet}`} className="block overflow-hidden rounded-2xl bg-surface ring-1 ring-white/[0.08] transition active:scale-95">
              <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2">
                <Avatar wallet={r.wallet} pseudo={r.pseudo} url={r.avatar_url} size={22} />
                <span className="truncate text-sm font-bold">{displayName(r)}</span>
              </div>
              <p className="px-3 py-2.5 font-mono text-[15px] font-bold text-muted-foreground">
                {r.trades_count.toLocaleString("fr-FR")} échange{r.trades_count > 1 ? "s" : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
