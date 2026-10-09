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
      <section className="relative isolate left-1/2 -mt-10 flex w-screen -translate-x-1/2 flex-col items-center overflow-hidden px-4 pt-10 pb-6 text-center sm:pt-16 sm:pb-10">
        <HeroArcs />
        <div aria-hidden className="pointer-events-none absolute top-8 left-1/2 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-pervenche/20 blur-[110px]" />
        <LogoMark size={104} className="drop-shadow-[0_0_40px_rgba(140,147,201,0.55)] sm:hidden" />
        <LogoMark size={132} className="hidden drop-shadow-[0_0_40px_rgba(140,147,201,0.55)] sm:block" />
        <p className="mt-8 hidden rounded-full border border-ligne bg-white/[0.03] px-4 py-1.5 text-xs text-muted-foreground sm:block">
          Le peuple frappe sa monnaie <span className="mx-1.5 text-ligne">|</span> Solana
        </p>
        <h1 className="text-lueur-gradient mt-5 max-w-3xl text-[2.6rem] leading-[1.05] font-semibold tracking-tight sm:mt-6 sm:text-6xl lg:text-7xl">
          Le launchpad des mèmes français.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
          Transforme un mème ou une actu en token, en une signature. Pas de prévente, pas d&apos;initiés&nbsp;: la même courbe pour tous.
        </p>
        <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:mt-9 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
          <Link href="/lancer" className="btn-primary px-6 py-3 text-base">
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
          <dl className="mt-10 grid w-full max-w-2xl grid-cols-3 divide-x divide-ligne rounded-2xl border border-ligne bg-white/[0.02]">
            {[
              { label: "Tokens créés", value: fmt(stats.tokens), sol: null },
              { label: "Volume échangé", value: `${fmt(stats.volumeSol, 2)} SOL`, sol: stats.volumeSol },
              { label: "Traders", value: fmt(stats.traders), sol: null },
            ].map((s) => (
              <div key={s.label} className="px-3 py-4 sm:px-4 sm:py-5">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="mt-1 font-mono text-lg font-medium sm:text-2xl">{s.value}</dd>
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
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Explorer les tokens</h2>
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
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Comment ça marche</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="surface flex gap-4 p-4 sm:p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pervenche/15 font-mono text-sm text-lueur">{s.n}</span>
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
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-pervenche">Lancement officiel</p>
          <h2 className="text-2xl font-semibold tracking-tight">Sois prévenu en premier.</h2>
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
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-vente/20 blur-[110px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-vente">La dette de la France, en direct</p>
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
