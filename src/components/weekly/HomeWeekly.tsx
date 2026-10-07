import Link from "next/link";
import { Countdown } from "@/components/weekly/Countdown";
import { getWeek, type WeekMeme } from "@/lib/weekly-data";

function Meme({ m, label }: { m: WeekMeme; label: string }) {
  return (
    <Link href={`/token/${m.mint}`} className="flex items-center gap-3 rounded-xl border border-ligne bg-white/[0.02] p-3 hover:bg-white/[0.04]">
      {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
      <img src={m.image_url} alt="" className="size-12 rounded-xl object-cover" />
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-widest text-amber-300">{label}</span>
        <span className="block truncate font-semibold">
          {m.name} <span className="font-mono text-sm font-normal text-pervenche">${m.ticker}</span>
        </span>
      </span>
    </Link>
  );
}

/** Accueil : la Une du concours (gagnant de la semaine passée et leader actuel). */
export async function HomeWeekly() {
  const [current, last] = await Promise.all([getWeek(0).catch(() => null), getWeek(1).catch(() => null)]);
  if (!current) return null;
  return (
    <section className="surface relative overflow-hidden p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-amber-400/10 blur-[100px]" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-300">Le Mème de la semaine</p>
          <h2 className="text-2xl font-semibold tracking-tight">La Une de Tiers-État</h2>
          <p className="text-sm text-muted-foreground">
            Fin du concours dans <Countdown end={current.end} />
          </p>
        </div>
        <Link href="/semaine" className="btn-ghost">
          Voir le classement
        </Link>
      </div>
      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        {last?.winner ? <Meme m={last.winner} label="🏆 Gagnant de la semaine dernière" /> : null}
        {current.winner ? (
          <Meme m={current.winner} label="En tête cette semaine" />
        ) : (
          <p className="rounded-xl border border-dashed border-ligne p-4 text-sm text-muted-foreground">
            Personne en tête : le premier mème échangé cette semaine prend la Une.
          </p>
        )}
      </div>
    </section>
  );
}
