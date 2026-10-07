import Link from "next/link";
import type { WeekMeme } from "@/lib/weekly-data";

const sol = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

/** Ligne du classement hebdomadaire. */
export function WeekRow({ m, rank }: { m: WeekMeme; rank: number }) {
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${m.disqualified ? "opacity-50" : ""}`}>
      <span className="w-8 shrink-0 text-center font-mono text-sm text-muted-foreground">{m.disqualified ? "—" : (["🥇", "🥈", "🥉"][rank - 1] ?? rank)}</span>
      {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
      <img src={m.image_url} alt="" className="size-10 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <Link href={`/token/${m.mint}`} className="block truncate font-medium hover:text-pervenche">
          {m.name} <span className="font-mono text-xs text-pervenche">${m.ticker}</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          {m.disqualified ? "Hors concours : le créateur a revendu ses tokens" : `${sol(m.volumeSol)} SOL échangés · ${m.traders} trader${m.traders > 1 ? "s" : ""}`}
        </p>
      </div>
      {!m.disqualified && <span className="font-mono text-sm font-semibold">{sol(m.score)}</span>}
    </li>
  );
}
