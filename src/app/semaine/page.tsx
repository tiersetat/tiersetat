import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/weekly/Countdown";
import { WeekRow } from "@/components/weekly/WeekRow";
import { DUMP_LIMIT_PCT, MIN_HOLDERS } from "@/lib/weekly";
import { solUsd } from "@/lib/feed";
import { emptyWeek, getPastWinners, getWeek } from "@/lib/weekly-data";

export const metadata: Metadata = {
  title: "Le Mème de la semaine — Tiers-État",
  description:
    "Chaque semaine, les nouveaux mèmes s'affrontent. La plus grosse capitalisation gagne et fait la Une de Tiers-État.",
};
export const revalidate = 60;

const jour = (ms: number) =>
  new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

export default async function SemainePage() {
  // Base indisponible (ex. copie du code sans configuration) : semaine vide plutôt qu'une erreur
  const [week, past, rate] = await Promise.all([
    getWeek(0).catch(emptyWeek),
    getPastWinners(12).catch(() => []),
    solUsd().catch(() => null),
  ]);
  const leader = week.winner;

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-pervenche">
          Concours hebdomadaire
        </p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Le Mème de la semaine
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Du lundi au dimanche, les mèmes créés dans la semaine
          s&apos;affrontent. Le dimanche soir, la plus grosse capitalisation
          gagne.
        </p>
      </header>

      <section className="surface relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(127_155_255/0.25),transparent)]"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Semaine du {jour(week.start)} au {jour(week.end - 1)} · fin dans{" "}
              <Countdown end={week.end} />
            </p>
            {leader ? (
              <>
                <p className="mt-3 text-xs uppercase tracking-widest text-pervenche">
                  En tête
                </p>
                <Link
                  href={`/token/${leader.mint}`}
                  className="mt-1 flex items-center gap-4 hover:opacity-90"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
                  <img
                    src={leader.image_url}
                    alt=""
                    className="size-16 rounded-2xl object-cover"
                  />
                  <span>
                    <span className="block text-2xl font-semibold">
                      {leader.name}
                    </span>
                    <span className="font-mono text-pervenche">
                      ${leader.ticker}
                    </span>
                  </span>
                </Link>
              </>
            ) : (
              <p className="mt-3 text-xl font-semibold">
                Personne en tête : il faut un mème de la semaine avec au moins{" "}
                {MIN_HOLDERS} détenteurs.
              </p>
            )}
          </div>
          <Link href="/lancer" className="btn-fete">
            Créer un mème
          </Link>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Le classement en direct</h2>
          {week.ranking.length === 0 ? (
            <p className="surface p-8 text-center text-sm text-muted-foreground">
              Aucun mème créé cette semaine pour l&apos;instant. Lance le
              premier !
            </p>
          ) : (
            <ol className="surface divide-y divide-ligne">
              {week.ranking.slice(0, 20).map((m, i) => (
                <WeekRow key={m.mint} m={m} rank={i + 1} solUsd={rate} />
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-6">
          <section className="surface space-y-2 p-5 text-sm">
            <h2 className="font-semibold">Les règles</h2>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>
                · Concourent les mèmes créés du lundi 0 h au dimanche minuit
                (heure de Paris).
              </li>
              <li>
                · Le gagnant : la plus grosse capitalisation le dimanche à
                minuit.
              </li>
              <li>
                · Il faut au moins {MIN_HOLDERS} vrais détenteurs ; le créateur
                ne compte pas.
              </li>
              <li>
                · Hors concours si le créateur a revendu {DUMP_LIMIT_PCT} % ou
                plus de ses tokens.
              </li>
              <li>
                · À gagner : la Une de l&apos;accueil toute la semaine suivante,
                le badge « Mème de la semaine » sur le profil du créateur et le
                mème imprimé sur un t-shirt offert par Tiers-État.
              </li>
            </ul>
          </section>
          <section className="surface space-y-3 p-5">
            <h2 className="font-semibold">Le palmarès</h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Le premier gagnant sera couronné lundi.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {past.map((w) => (
                  <li key={w.start} className="flex justify-between gap-2">
                    <Link
                      href={`/token/${w.mint}`}
                      className="truncate hover:text-pervenche"
                    >
                      {w.name}
                    </Link>
                    <span className="shrink-0 text-muted-foreground">
                      sem. du {jour(w.start)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <p className="text-xs text-muted-foreground">
        Classement calculé d&apos;après les échanges enregistrés sur la
        blockchain, mis à jour chaque minute. Le concours ne demande aucun
        achat. Toute manipulation (comptes multiples, échanges fictifs) entraîne
        l&apos;exclusion. Un memecoin est très risqué : ce classement n&apos;est
        pas un conseil d&apos;investissement.
      </p>
    </div>
  );
}
