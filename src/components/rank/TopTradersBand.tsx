import Link from "next/link";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";
import { usd } from "@/lib/market-format";
import { topTradersByPnl } from "@/lib/pnl-leaderboard";

/** Petite bande en haut de l'accueil : les traders qui gagnent le plus, et le mème qui les a fait gagner. */
export async function TopTradersBand() {
  const rows = (await topTradersByPnl(12).catch(() => [])).filter((r) => r.pnlSol > 0);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Meilleurs traders" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-muted-foreground">🏆 Les plus gros gains</h2>
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
              <div className="flex items-center gap-2 px-3 py-2.5">
                {r.best && (
                  // eslint-disable-next-line @next/next/no-img-element -- images IPFS
                  <img src={r.best.image_url} alt="" className="size-7 shrink-0 rounded-full bg-muted object-cover" />
                )}
                <span className="truncate font-mono text-[15px] font-bold text-achat">+{usd(r.pnlUsd)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
