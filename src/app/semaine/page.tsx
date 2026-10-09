import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/weekly/Countdown";
import { WeekRow } from "@/components/weekly/WeekRow";
import { DUMP_LIMIT_PCT, TRADER_BONUS_SOL, WINNER_POINTS } from "@/lib/weekly";
import { emptyWeek, getPastWinners, getWeek } from "@/lib/weekly-data";

export const metadata: Metadata = {
  title: "Le Mème de la semaine — Tiers-État",
  description: "Chaque semaine, les mèmes s'affrontent. Le plus échangé par la communauté fait la Une de Tiers-État.",
};
export const revalidate = 60;

const jour = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

export default async function SemainePage() {
  // Base indisponible (ex. copie du code sans configuration) : semaine vide plutôt qu'une erreur
  const [week, past] = await Promise.all([getWeek(0).catch(emptyWeek), getPastWinners(12).catch(() => [])]);
  const leader = week.winner;

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-300">Concours hebdomadaire</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Le Mème de la semaine</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Du lundi au dimanche, les mèmes s&apos;affrontent. Celui que la communauté échange le plus fait la Une de Tiers-État.
        </p>
      </header>

      <section className="surface relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-amber-400/15 blur-[100px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Semaine du {jour(week.start)} au {jour(week.end - 1)} · fin dans <Countdown end={week.end} />
            </p>
            {leader ? (
              <>
                <p className="mt-3 text-xs uppercase tracking-widest text-amber-300">En tête</p>
                <Link href={`/token/${leader.mint}`} className="mt-1 flex items-center gap-4 hover:opacity-90">
                  {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
                  <img src={leader.image_url} alt="" className="size-16 rounded-2xl object-cover" />
                  <span>
                    <span className="block text-2xl font-semibold">{leader.name}</span>
                    <span className="font-mono text-pervenche">${leader.ticker}</span>
                  </span>
                </Link>
              </>
            ) : (
              <p className="mt-3 text-xl font-semibold">Personne en tête : le premier mème échangé cette semaine prend la Une.</p>
            )}
          </div>
          <Link href="/lancer" className="btn-primary">
            Frapper un mème
          </Link>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Le classement en direct</h2>
          {week.ranking.length === 0 ? (
            <p className="surface p-8 text-center text-sm text-muted-foreground">Aucun échange cette semaine pour l&apos;instant.</p>
          ) : (
            <ol className="surface divide-y divide-ligne">
              {week.ranking.slice(0, 20).map((m, i) => (
                <WeekRow key={m.mint} m={m} rank={i + 1} />
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-6">
          <section className="surface space-y-2 p-5 text-sm">
            <h2 className="font-semibold">Les règles</h2>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>· Score : SOL échangés sur le mème par d&apos;autres que son créateur, plus {TRADER_BONUS_SOL.toLocaleString("fr-FR")} par trader différent.</li>
              <li>· Les échanges du créateur sur son propre mème ne comptent pas.</li>
              <li>· Hors concours si le créateur a revendu {DUMP_LIMIT_PCT} % ou plus de ses tokens.</li>
              <li>· Le gagnant fait la Une de l&apos;accueil et son créateur gagne {WINNER_POINTS} points dans les Cahiers.</li>
            </ul>
          </section>
          <section className="surface space-y-3 p-5">
            <h2 className="font-semibold">Le palmarès</h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">Le premier gagnant sera couronné lundi.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {past.map((w) => (
                  <li key={w.start} className="flex justify-between gap-2">
                    <Link href={`/token/${w.mint}`} className="truncate hover:text-pervenche">
                      🏆 {w.name}
                    </Link>
                    <span className="shrink-0 text-muted-foreground">sem. du {jour(w.start)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <p className="text-xs text-muted-foreground">
        Classement calculé d&apos;après les échanges enregistrés sur la blockchain, mis à jour chaque minute. Les points n&apos;ont aucune valeur
        monétaire. Toute manipulation (comptes multiples, échanges fictifs) entraîne l&apos;exclusion.
      </p>
    </div>
  );
}
