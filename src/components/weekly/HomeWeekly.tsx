import Link from "next/link";
import { Countdown } from "@/components/weekly/Countdown";
import { usd } from "@/lib/market-format";
import { solUsd } from "@/lib/feed";
import { getWeek, type WeekMeme } from "@/lib/weekly-data";

function Meme({ m, label, rate, big }: { m: WeekMeme; label: string; rate: number | null; big?: boolean }) {
  return (
    <Link href={`/token/${m.mint}`} className="ios-press flex min-w-0 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
      <img src={m.image_url} alt="" className={`${big ? "size-16" : "size-11"} shrink-0 rounded-2xl object-cover ring-1 ring-white/15`} />
      <span className="min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-widest text-pervenche">{label}</span>
        <span className={`block truncate font-extrabold ${big ? "text-xl" : "text-base"}`}>
          {m.name} <span className="font-mono text-sm font-semibold text-pervenche">${m.ticker}</span>
        </span>
        <span className="block text-xs text-muted-foreground">
          {rate ? usd(m.marketCapSol * rate) : `${m.marketCapSol.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} SOL`} de capitalisation · {m.holders} détenteurs
        </span>
      </span>
    </Link>
  );
}

/** Accueil : la Une du concours. Le gagnant de la semaine passée en grand, le leader actuel et le compte à rebours. */
export async function HomeWeekly() {
  const [current, last, rate] = await Promise.all([getWeek(0).catch(() => null), getWeek(1).catch(() => null), solUsd().catch(() => null)]);
  if (!current) return null;
  return (
    <section className="surface relative overflow-hidden p-4 sm:p-5">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-[radial-gradient(closest-side,rgb(127_155_255/0.25),transparent)]" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Le Mème de la semaine</h2>
          <p className="text-xs text-muted-foreground">
            La plus grosse capitalisation gagne · fin dans <Countdown end={current.end} />
          </p>
        </div>
        <Link href="/semaine" className="chip shrink-0 px-3 py-1.5 text-xs">
          Classement
        </Link>
      </div>
      <div className="relative mt-4 grid gap-4 sm:grid-cols-2 min-[1400px]:grid-cols-1">
        {last?.winner && <Meme m={last.winner} label="Gagnant de la semaine dernière" rate={rate} big />}
        {current.winner ? (
          <Meme m={current.winner} label="En tête cette semaine" rate={rate} big={!last?.winner} />
        ) : (
          <Link href="/lancer" className="ios-press flex items-center justify-between gap-3 rounded-2xl border border-dashed border-white/15 p-3 text-sm">
            <span className="text-muted-foreground">Personne en tête cette semaine. Ton mème peut prendre la Une.</span>
            <span className="btn-fete min-h-9 shrink-0 px-4 py-1.5 text-sm">Créer un mème</span>
          </Link>
        )}
      </div>
    </section>
  );
}
