import Link from "next/link";
import { Suspense } from "react";
import { HomeBuzz } from "@/components/buzz/HomeBuzz";
import { HomeWeekly } from "@/components/weekly/HomeWeekly";
import { DebtLive } from "@/components/dette/DebtLive";
import { DETTE } from "@/lib/dette";
import { getOfficialDette, type DetteToken } from "@/lib/dette-token";
import { JoinWaitlist } from "@/components/waitlist/JoinWaitlist";
import { getWaitlistCount } from "@/lib/waitlist";
import { FounderGauge } from "@/components/trust/FounderBadge";
import { getFounders, type Founders } from "@/lib/founders-data";
import { HeroArcs } from "@/components/brand/HeroArcs";
import { LogoMark } from "@/components/brand/Logo";
import { Eur } from "@/components/Eur";
import { TokenGrid } from "@/components/home/TokenGrid";
import { getStats, listTokens, parseTab, TABS, type PlatformStats, type Tab, type TokenCard } from "@/lib/tokens";

const STEPS = [
  {
    n: "01",
    title: "Choisis ton mème",
    text: "Une image, une actu qui buzze en France, une private joke nationale. Nom, ticker, description.",
  },
  {
    n: "02",
    title: "Signe une seule fois",
    text: "Le token et sa bonding curve sont créés en une transaction depuis ton wallet. Aucune prévente, aucun initié.",
  },
  {
    n: "03",
    title: "Direction le DEX",
    text: "Le prix suit une courbe publique, la même pour tous. Une fois la courbe remplie, le token migre sur un DEX avec une liquidité verrouillée.",
  },
];

const fmt = (n: number, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });

export default async function Home({ searchParams }: PageProps<"/">) {
  const tab = parseTab((await searchParams).tri);
  let tokens: TokenCard[] = [];
  let stats: PlatformStats = { tokens: 0, volumeSol: 0, traders: 0 };
  let dette: DetteToken | null = null;
  let waitlist: number | null = null;
  let founders: Founders | null = null;
  try {
    [tokens, stats, dette, waitlist, founders] = await Promise.all([listTokens(tab), getStats(), getOfficialDette(), getWaitlistCount(), getFounders()]);
  } catch (err) {
    console.error("accueil", err);
  }

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero, compact sur téléphone pour montrer vite les mèmes */}
      <section className="relative isolate left-1/2 -mt-[6.5rem] flex w-screen -translate-x-1/2 flex-col items-center overflow-hidden px-4 pt-[6.5rem] pb-6 text-center sm:-mt-[7rem] sm:pt-[8.5rem] sm:pb-10">
        <HeroArcs />
        <LogoMark size={96} className="rise-in drop-shadow-[0_10px_30px_rgba(61,90,254,0.6)] sm:hidden" />
        <LogoMark size={124} className="rise-in hidden drop-shadow-[0_10px_30px_rgba(61,90,254,0.6)] sm:block" />
        <p className="rise-in mt-7 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-foreground">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2 rounded-full bg-electrique" />
            <span className="size-2 rounded-full bg-white" />
            <span className="size-2 rounded-full bg-vente" />
          </span>
          Le peuple frappe sa monnaie
        </p>
        <h1 className="rise-in rise-in-2 mt-5 max-w-4xl text-[2.9rem] leading-[1.02] font-extrabold sm:mt-6 sm:text-7xl lg:text-[5.5rem]">
          Le launchpad des <span className="sticker mt-2 whitespace-nowrap">mèmes français</span>
        </h1>
        <p className="rise-in rise-in-3 mt-6 max-w-xl text-base text-muted-foreground sm:mt-8 sm:text-lg">
          Transforme un mème ou une actu en token, en une signature. Pas de prévente, pas d&apos;initiés&nbsp;: la même courbe pour tous.
        </p>
        <div className="rise-in rise-in-3 mt-7 flex w-full max-w-sm flex-col gap-3 sm:mt-9 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
          <Link href="/lancer" className="btn-fete px-7 py-3.5 text-base">
            Créer un token
          </Link>
          <Link href="/ca-buzz" className="btn-ghost px-6 py-3 text-base">
            Voir ce qui buzz
          </Link>
        </div>
        <Link href="/demarrer" className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Nouveau ici ? Bien démarrer en 3 minutes →
        </Link>

        {stats.tokens > 0 && (
          <dl className="mt-10 grid w-full max-w-2xl grid-cols-3 divide-x divide-ligne rounded-3xl border border-ligne bg-surface">
            {[
              { label: "Tokens créés", value: fmt(stats.tokens), sol: null, color: "text-soleil" },
              { label: "Volume échangé", value: `${fmt(stats.volumeSol, 2)} SOL`, sol: stats.volumeSol, color: "text-achat" },
              { label: "Traders", value: fmt(stats.traders), sol: null, color: "text-bonbon" },
            ].map((s) => (
              <div key={s.label} className="px-3 py-4 sm:px-4 sm:py-5">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className={`mt-1 font-mono text-lg font-bold sm:text-2xl ${s.color}`}>{s.value}</dd>
                {s.sol !== null && <Eur sol={s.sol} className="text-[11px] text-muted-foreground/80" />}
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Les mèmes : le cœur du launchpad, juste après le titre */}
      <section id="explorer" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Explorer les mèmes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Mis à jour en temps réel depuis la blockchain.</p>
          </div>
          <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Trier les tokens">
            {(Object.keys(TABS) as Tab[]).map((key) => (
              <Link
                key={key}
                href={key === "nouveaux" ? "/#explorer" : `/?tri=${key}#explorer`}
                scroll={false}
                aria-current={tab === key ? "page" : undefined}
                className={`chip shrink-0 ${tab === key ? "chip-active" : ""}`}
              >
                {TABS[key]}
              </Link>
            ))}
          </nav>
        </div>
        <TokenGrid key={tab} tab={tab} initial={tokens} />
      </section>

      {/* Le Mème de la semaine */}
      <Suspense fallback={<div className="h-56 animate-pulse rounded-2xl border border-ligne bg-white/[0.02]" />}>
        <HomeWeekly />
      </Suspense>

      {/* Ça brûle en France : actus chaudes (streamées, n'attendent pas les flux RSS) */}
      <Suspense fallback={<div className="h-[26rem] animate-pulse rounded-2xl border border-ligne bg-white/[0.02]" />}>
        <HomeBuzz />
      </Suspense>

      {/* Comment ça marche, compact */}
      <section className="space-y-5">
        <h2 className="text-3xl font-extrabold sm:text-4xl">Comment ça marche</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n} className="surface flex gap-4 p-4 sm:p-5">
              <span
                className={`grid size-10 shrink-0 -rotate-3 place-items-center rounded-2xl font-mono text-sm font-extrabold ${["bg-electrique text-white", "bg-soleil text-nuit", "bg-vente text-white"][i]}`}
              >
                {s.n}
              </span>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Lancement officiel : liste d'attente + places de Fondateur */}
      <section className="surface grid gap-8 p-6 sm:p-8 md:grid-cols-2 md:items-center">
        <div className="space-y-3">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-soleil">Lancement officiel</p>
          <h2 className="text-3xl font-extrabold">Sois prévenu en premier.</h2>
          <JoinWaitlist initialCount={waitlist} />
        </div>
        {founders && (
          <div className="flex md:justify-end">
            <FounderGauge taken={founders.taken} seats={founders.seats} />
          </div>
        )}
      </section>

      {/* La dette en direct */}
      <section className="surface relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 size-96 rounded-full bg-[radial-gradient(closest-side,rgb(255_61_104/0.3),transparent)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-vente">La dette de la France, en direct</p>
            <DebtLive className="block whitespace-nowrap font-mono text-[1.7rem] font-semibold text-foreground sm:text-5xl" />
            <p className="text-sm text-muted-foreground">
              +{Math.round(DETTE.eurPerSecond).toLocaleString("fr-FR")} € chaque seconde. L&apos;État imprime de la dette, le peuple frappe sa monnaie.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {dette ? (
              <Link href={`/token/${dette.mint}`} className="btn-primary">
                Acheter $DETTE
              </Link>
            ) : null}
            <Link href="/dette" className={dette ? "btn-ghost" : "btn-primary"}>
              Voir le compteur
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
