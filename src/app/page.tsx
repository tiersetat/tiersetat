import Link from "next/link";
import { Suspense } from "react";
import { JoinWaitlist } from "@/components/waitlist/JoinWaitlist";
import { getWaitlistCount } from "@/lib/waitlist";
import { FounderGauge } from "@/components/trust/FounderBadge";
import { getFounders, type Founders } from "@/lib/founders-data";
import { TokenGrid } from "@/components/home/TokenGrid";
import { listTokens, parseTab, TABS, type Tab, type TokenCard } from "@/lib/tokens";
import { CashBar } from "@/components/market/CashBar";
import { Gazette } from "@/components/gazette/Gazette";
import { getGazette } from "@/lib/gazette";
import { SearchBox } from "@/components/market/SearchBox";
import { GuestOnly } from "@/components/layout/GuestOnly";
import { MarketRow, type MarketItem } from "@/components/market/MarketRow";
import { WatchlistView } from "@/components/market/WatchlistView";
import { cryptos, solanaTrending } from "@/lib/market-data";

/** Listes du marché : nos mèmes (onglets Tiers-État) + tout Solana (données publiques). */
const EXTERNAL = { solana: "Tendances Solana", cryptos: "Cryptos établies" } as const;
type External = keyof typeof EXTERNAL;
type MarketTab = Tab | External | "liste";
const MARKET_TABS: { key: MarketTab; label: string }[] = [
  { key: "liste", label: "⭐ Ma liste" },
  ...(Object.keys(TABS) as Tab[]).map((k) => ({ key: k, label: TABS[k] })),
  { key: "solana", label: EXTERNAL.solana },
  { key: "cryptos", label: EXTERNAL.cryptos },
];
function parseMarketTab(v: unknown): MarketTab {
  return v === "liste" || v === "solana" || v === "cryptos" ? v : parseTab(v);
}

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


export default async function Home({ searchParams }: PageProps<"/">) {
  const market = parseMarketTab((await searchParams).tri);
  const tab = parseTab(market);
  let external: MarketItem[] | null = null;
  if (market === "solana" || market === "cryptos") {
    try {
      external = market === "solana" ? await solanaTrending() : await cryptos();
    } catch {
      external = [];
    }
  }
  let tokens: TokenCard[] = [];
  let waitlist: number | null = null;
  let founders: Founders | null = null;
  try {
    [tokens, waitlist, founders] = await Promise.all([external || market === "liste" ? Promise.resolve([]) : listTokens(tab), getWaitlistCount(), getFounders()]);
  } catch (err) {
    console.error("accueil", err);
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Ton cash (connecté), puis la Gazette : la Une du jour, la Bourse du peuple, Ça brûle, les Dépêches */}
      <div className="space-y-4">
        <div className="empty:hidden">
          <CashBar />
        </div>
        <Suspense fallback={<div className="gazette h-[38rem] animate-pulse rounded-[28px] opacity-60" />}>
          <GazetteSection />
        </Suspense>
        <GuestOnly>
          <div className="surface flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
            <p className="text-sm">
              <strong className="text-foreground">Nouveau ici ?</strong> <span className="text-muted-foreground">Transforme un mème ou une actu en token, en une signature. La même courbe pour tous.</span>
            </p>
            <div className="flex gap-2">
              <Link href="/demarrer" className="btn-ghost min-h-10 px-4 py-2 text-sm">
                Bien démarrer
              </Link>
              <Link href="/lancer" className="btn-fete min-h-10 px-4 py-2 text-sm">
                Créer un token
              </Link>
            </div>
          </div>
        </GuestOnly>
      </div>

      {/* Les mèmes : le cœur du launchpad, juste après le titre */}
      <section id="explorer" className="scroll-mt-24 space-y-5">
        <SearchBox />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Toutes les cotations</h2>
            <p className="mt-1 text-sm text-muted-foreground">Nos mèmes en temps réel, et tous les tokens de Solana.</p>
          </div>
          <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Trier les tokens">
            {MARKET_TABS.map(({ key, label }) => (
              <Link
                key={key}
                href={key === "nouveaux" ? "/#explorer" : `/?tri=${key}#explorer`}
                scroll={false}
                aria-current={market === key ? "page" : undefined}
                className={`chip shrink-0 ${market === key ? "chip-active" : ""}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        {market === "liste" ? (
          <WatchlistView />
        ) : external ? (
          external.length ? (
            <ul className="surface divide-y divide-ligne/60 p-1.5">
              {external.map((t, i) => (
                <MarketRow key={t.address} t={t} rank={i + 1} />
              ))}
            </ul>
          ) : (
            <p className="surface p-8 text-center text-sm text-muted-foreground">Les données du marché sont momentanément indisponibles. Réessaie dans une minute.</p>
          )
        ) : (
          <TokenGrid key={tab} tab={tab} initial={tokens} />
        )}
        {external && <p className="text-xs text-muted-foreground">Données publiques (DexScreener, GeckoTerminal), pour information. Ces tokens ne sont ni vérifiés ni recommandés par Tiers-État.</p>}
      </section>

      {/* Le Mème de la semaine */}


      <GuestOnly>
        <div className="space-y-16 sm:space-y-24">
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

        </div>
      </GuestOnly>
    </div>
  );
}

/** La Gazette, streamée : le reste de la page n'attend pas les flux d'actualité. */
async function GazetteSection() {
  const data = await getGazette().catch(() => null);
  return data ? <Gazette data={data} /> : null;
}
