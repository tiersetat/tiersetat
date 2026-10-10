import Link from "next/link";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";
import { usd } from "@/lib/market-format";
import type { PnlRow } from "@/lib/pnl-leaderboard";

const MEDAL = ["🥇", "🥈", "🥉"];

/** Classement des traders par gains, simple et lisible. */
export function PnlLeaderboard({ rows }: { rows: PnlRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-white/[0.08]">
        <p className="font-bold">Le classement démarre au premier échange</p>
        <p className="mt-1 text-sm text-muted-foreground">Les traders qui gagnent le plus apparaîtront ici. La première place est libre.</p>
      </div>
    );
  }
  return (
    <ol className="overflow-hidden rounded-3xl bg-surface ring-1 ring-white/[0.08]">
      {rows.map((r, i) => {
        const up = r.pnlSol >= 0;
        return (
          <li key={r.wallet} className="border-b border-white/[0.06] last:border-0">
            <Link href={`/profil/${r.wallet}`} className="flex items-center gap-3 px-4 py-3.5 transition active:bg-white/[0.05]">
              <span className="w-7 shrink-0 text-center text-lg font-extrabold text-muted-foreground">{MEDAL[i] ?? `${i + 1}.`}</span>
              <Avatar wallet={r.wallet} pseudo={r.pseudo} url={r.avatar_url} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-bold">{displayName(r)}</span>
                {r.best && <span className="block truncate text-xs text-muted-foreground">Meilleur coup : ${r.best.ticker}</span>}
              </span>
              <span className={`shrink-0 font-mono text-[16px] font-extrabold ${up ? "text-achat" : "text-vente"}`}>
                {up ? "+" : "−"}
                {usd(Math.abs(r.pnlUsd ?? 0))}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
