import Link from "next/link";
import { usd } from "@/lib/market-format";
import { MIN_HOLDERS } from "@/lib/weekly";
import type { WeekMeme } from "@/lib/weekly-data";

const sol = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Ligne du classement hebdomadaire : capitalisation, détenteurs et statut (en course, pas encore éligible, hors concours). */
export function WeekRow({ m, rank, solUsd }: { m: WeekMeme; rank: number; solUsd: number | null }) {
  const status = m.disqualified
    ? "Hors concours : le créateur a revendu ses tokens"
    : m.eligible
      ? `${m.holders} détenteurs`
      : `${m.holders}/${MIN_HOLDERS} détenteurs pour entrer dans la course`;
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${m.eligible ? "" : "opacity-60"}`}>
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${m.eligible && rank <= 3 ? "bg-white/12 text-white" : "text-muted-foreground"}`}>
        {m.eligible ? rank : "–"}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
      <img src={m.image_url} alt="" className="size-10 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <Link href={`/token/${m.mint}`} className="block truncate font-medium hover:text-pervenche">
          {m.name} <span className="font-mono text-xs text-pervenche">${m.ticker}</span>
        </Link>
        <p className="text-xs text-muted-foreground">{status}</p>
      </div>
      <span className="text-right">
        <span className="block font-mono text-sm font-semibold">{solUsd ? usd(m.marketCapSol * solUsd) : `${sol(m.marketCapSol)} SOL`}</span>
        <span className="block text-[11px] text-muted-foreground">capitalisation</span>
      </span>
    </li>
  );
}
