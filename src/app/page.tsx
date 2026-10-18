import Link from "next/link";
import { Suspense } from "react";
import { CashBar } from "@/components/market/CashBar";
import { MarketRow, type MarketItem } from "@/components/market/MarketRow";
import { WatchlistView } from "@/components/market/WatchlistView";
import { GuestOnly } from "@/components/layout/GuestOnly";
import { TopTradersBand } from "@/components/rank/TopTradersBand";
import { CHAINS, isChain, topCryptos, type ChainId } from "@/lib/market-feeds";
import { loadList } from "@/lib/market-lists";
import { CATS, parseKey, TABS } from "@/lib/market-tabs";
import { NewTokensLive } from "@/components/market/NewTokensLive";
import { DexPaidLive } from "@/components/market/DexPaidLive";
import type { PaidItem } from "@/lib/market-feeds";
import type { Category } from "@/lib/hyperliquid";
import { HomeBuzz } from "@/components/buzz/HomeBuzz";
import { HomeWeekly } from "@/components/weekly/HomeWeekly";
import { LiveActivity } from "@/components/social/LiveActivity";
import { Panel } from "@/components/dashboard/Panel";
import { TickerCards } from "@/components/dashboard/TickerCards";
import { MoversPanel } from "@/components/dashboard/Movers";
import { WatchlistPanel } from "@/components/dashboard/WatchlistPanel";
import { BtcHistory } from "@/components/dashboard/BtcHistory";
import { majors, movers } from "@/lib/dashboard-data";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const key = parseKey(sp.tri);
  const chain = isChain(sp.chaine) ? sp.chaine : null;
  const cat = (
    CATS.some((c) => c.key === sp.cat) ? sp.cat : null
  ) as Category | null;
  let items: MarketItem[] | null = null;
  let failed = false;
  try {
    items = await loadList(key, chain, cat);
  } catch (err) {
    console.error("accueil", err);
    failed = true;
  }
  const memeTab = key === "tiers-etat";

  const [majorList, move, market] = await Promise.all([
    majors().catch(() => []),
    movers().catch(() => ({ gainers: [], losers: [] })),
    topCryptos().catch(() => []),
  ]);

  return (
    // Tableau de bord : une grille qui s'adapte à la largeur (téléphone empilé, ordinateur en 2 colonnes, grand écran et ultrawide en 3 colonnes)
    <div className="dash">
      {/* Social : liquidités et qui achète en ce moment */}
      <div className="dash-social space-y-4">
        <div className="empty:hidden">
          <CashBar />
        </div>
        <Panel title="Social" className="dash-social-feed">
          <LiveActivity limit={20} />
        </Panel>
      </div>

      {/* Les grandes cryptos, en cartes avec leur courbe 7 jours */}
      <div className="dash-tickers">
        <TickerCards items={majorList} />
      </div>

      {/* Bienvenue (visiteur), Mème de la semaine, plus fortes hausses et baisses */}
      <div className="dash-mid">
        <GuestOnly>
          <section className="dash-panel dash-hero relative overflow-hidden p-5 sm:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[radial-gradient(closest-side,rgb(127_155_255/0.35),transparent)]" />
            <h1 className="relative font-[family-name:var(--font-display)] text-3xl leading-tight font-extrabold">
              Crée. Trade. <span className="text-lueur-gradient">Gagne ensemble.</span>
            </h1>
            <p className="relative mt-2 max-w-md text-[15px] text-white/80">
              Le launchpad et l&apos;appli de trading du peuple : lance ton mème en une minute, trade toutes les cryptos et suis ce que tes amis achètent.
            </p>
            <div className="relative mt-4 flex flex-wrap gap-2">
              <Link href="/portefeuille" className="btn-fete min-h-11 px-6">
                Commencer
              </Link>
              <Link href="/verifier" className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-5 text-sm font-bold">
                Règles vérifiables sur la blockchain
              </Link>
            </div>
          </section>
        </GuestOnly>
        <div className="dash-weekly">
          <Suspense fallback={<div className="dash-panel h-28 animate-pulse" />}>
            <HomeWeekly />
          </Suspense>
        </div>
        <MoversPanel title="Plus fortes hausses (24 h)" items={move.gainers} />
        <MoversPanel title="Plus fortes baisses (24 h)" items={move.losers} />
      </div>

      {/* L'actu du jour et les plus gros gains des traders */}
      <div className="dash-news space-y-4">
        <Suspense fallback={<div className="dash-panel h-[26rem] animate-pulse" />}>
          <HomeBuzz />
        </Suspense>
        <Suspense fallback={null}>
          <TopTradersBand />
        </Suspense>
      </div>

      {/* Ma watchlist (favoris) et le Bitcoin heure par heure */}
      <div className="dash-watch">
        <WatchlistPanel top={market} />
      </div>
      <div className="dash-hist">
        <Suspense fallback={<div className="dash-panel h-64 animate-pulse" />}>
          <BtcHistory />
        </Suspense>
      </div>

      {/* Tous les marchés : onglets, filtres et liste des tokens */}
      <section id="tokens" className="dash-tokens scroll-mt-20 space-y-3">
          <nav
            className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
            aria-label="Listes de tokens"
          >
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/?tri=${t.key}`}
                scroll={false}
                aria-current={key === t.key ? "page" : undefined}
                className={`chip shrink-0 ${key === t.key ? "chip-active" : ""}`}
              >
                {t.key === "liste" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-[18px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    aria-label="Ma liste"
                  >
                    <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
                  </svg>
                ) : (
                  t.label
                )}
              </Link>
            ))}
          </nav>

          {(key === "tendances" || key === "dexpaye" || key === "migre" || key === "bonding") && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <Link
                href={`/?tri=${key}`}
                scroll={false}
                className={`chip shrink-0 py-1.5 ${!chain ? "chip-active" : ""}`}
              >
                Toutes
              </Link>
              {(Object.keys(CHAINS) as ChainId[]).map((c) => (
                <Link
                  key={c}
                  href={`/?tri=${key}&chaine=${c}`}
                  scroll={false}
                  className={`chip shrink-0 gap-1.5 py-1.5 ${chain === c ? "chip-active" : ""}`}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: CHAINS[c].color }}
                  />
                  {CHAINS[c].label}
                </Link>
              ))}
            </div>
          )}

          {key === "bourse" && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <Link
                href="/?tri=bourse"
                scroll={false}
                className={`chip shrink-0 py-1.5 ${!cat ? "chip-active" : ""}`}
              >
                Tout
              </Link>
              {CATS.map((c) => (
                <Link
                  key={c.key}
                  href={`/?tri=bourse&cat=${c.key}`}
                  scroll={false}
                  className={`chip shrink-0 py-1.5 ${cat === c.key ? "chip-active" : ""}`}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          )}

          {key === "francais" && (
            <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs text-muted-foreground">
              <b className="text-foreground">Repérés automatiquement, non vérifiés, non recommandés.</b> Des mèmes à thème français du marché Solana, hors Tiers-État.
              Sont écartés : la politique, les insultes et les drames, les créateurs qui ont lancé plus de 50 tokens, et ceux qui ont moins de 100 détenteurs.
              Les memecoins sont très risqués : tu peux tout perdre.
            </p>
          )}

          {key === "liste" ? (
            <WatchlistView />
          ) : key === "nouveaux" ? (
            <NewTokensLive />
        ) : key === "dexpaye" ? (
          <DexPaidLive key={chain ?? "toutes"} chain={chain} initial={(items ?? []) as PaidItem[]} />
          ) : failed || !items ? (
            <p className="rounded-3xl bg-surface p-8 text-center text-sm text-muted-foreground">
              Liste momentanément indisponible. Réessaie dans une minute.
            </p>
          ) : items.length === 0 ? (
            <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-white/[0.08]">
              <p className="font-bold">
                {memeTab ? "Aucun mème ici pour l'instant" : "Rien à afficher"}
              </p>
              {memeTab && (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Le premier mème de Tiers-État reste à créer. Ce sera
                    peut-être le tien.
                  </p>
                  <Link href="/lancer" className="btn-fete mt-4 min-h-11 px-6">
                    Créer un mème
                  </Link>
                </>
              )}
            </div>
          ) : (
            <ul className="overflow-hidden rounded-3xl bg-surface p-1.5 ring-1 ring-white/[0.08]">
              {items.map((t) => (
                <MarketRow key={t.address} t={t} />
              ))}
            </ul>
          )}
          {key === "tendances" && (
            <p className="px-1 text-xs text-muted-foreground">
              Tokens « DEX payé » et boostés sur DexScreener, avec de
              l&apos;activité, classés par volume des 6 dernières heures. Ni
              vérifiés ni recommandés par Tiers-État.
            </p>
          )}
          {key === "bourse" && (
            <p className="px-1 text-xs text-muted-foreground">
              Contrats perpétuels avec effet de levier, alimentés par
              Hyperliquid : actions, indices, matières premières, devises et
              pré-IPO. Très risqué : les pertes sont multipliées par le levier.
            </p>
          )}
          {key === "cryptos" && (
            <p className="px-1 text-xs text-muted-foreground">
              Les plus grandes cryptos du monde (CoinGecko), hors stablecoins.
              Pour information.
            </p>
          )}
      </section>
    </div>
  );
}
