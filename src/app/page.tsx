import Link from "next/link";
import { Suspense } from "react";
import { CashBar } from "@/components/market/CashBar";
import { MarketRow, type MarketItem } from "@/components/market/MarketRow";
import { WatchlistView } from "@/components/market/WatchlistView";
import { GuestOnly } from "@/components/layout/GuestOnly";
import { TopTradersBand } from "@/components/rank/TopTradersBand";
import { CHAINS, dexPaidTrending, isChain, topCryptos, type ChainId } from "@/lib/market-feeds";
import { NewTokensLive } from "@/components/market/NewTokensLive";
import { hyperliquidMarkets, type Category } from "@/lib/hyperliquid";
import { HomeBuzz } from "@/components/buzz/HomeBuzz";
import { solUsd } from "@/lib/feed";
import { listTokens, type Tab, type TokenCard } from "@/lib/tokens";
import { TOTAL_SUPPLY } from "@/lib/traders";

/** Onglets de la liste : tout le marché (multi-blockchains), puis nos mèmes (launchpad). */
const TABS = [
  { key: "liste", label: "Ma liste" },
  { key: "tendances", label: "Tendances" },
  { key: "nouveaux", label: "Nouveaux" },
  { key: "cryptos", label: "Cryptos" },
  { key: "tiers-etat", label: "Tiers-État" },
  { key: "bourse", label: "Actions ×10" },
] as const;
type Key = (typeof TABS)[number]["key"];
/** Catégories des marchés Hyperliquid */
const CATS: { key: Category; label: string }[] = [
  { key: "actions", label: "Actions" },
  { key: "indices", label: "Indices · ETF" },
  { key: "matieres", label: "Matières premières" },
  { key: "pre-ipo", label: "Pré-IPO" },
  { key: "devises", label: "Forex" },
  { key: "taux", label: "Taux" },
];
const parseKey = (v: unknown): Key => (TABS.some((t) => t.key === v) ? (v as Key) : "tendances");

function fromMeme(t: TokenCard, sol: number | null): MarketItem {
  const mcapUsd = sol === null ? null : Number(t.market_cap_sol) * sol;
  return {
    address: t.mint,
    name: t.name,
    symbol: t.ticker,
    imageUrl: t.image_url,
    priceUsd: mcapUsd === null ? null : mcapUsd / TOTAL_SUPPLY,
    mcapUsd,
    change24: null,
    progress: t.migrated ? undefined : Number(t.curve_progress),
    href: `/token/${t.mint}`,
  };
}

async function loadList(key: Key, chain: ChainId | null, cat: Category | null): Promise<MarketItem[] | null> {
  if (key === "liste" || key === "nouveaux") return null;
  if (key === "bourse") {
    const all = await hyperliquidMarkets();
    return all
      .filter((m) => !cat || m.category === cat)
      .map((m) => ({ address: m.id, name: m.name, symbol: m.symbol, imageUrl: m.imageUrl, emoji: m.emoji, priceUsd: m.priceUsd, mcapUsd: null, change24: m.change24, leverage: m.maxLeverage, href: `/bourse/${encodeURIComponent(m.id)}` }));
  }
  if (key === "cryptos") return topCryptos();
  if (key === "tendances") {
    const all = await dexPaidTrending();
    return chain ? all.filter((t) => t.chain === chain) : all;
  }
  const [memes, sol] = await Promise.all([listTokens("tendances" as Tab), solUsd().catch(() => null)]);
  return memes.map((m) => fromMeme(m, sol));
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const key = parseKey(sp.tri);
  const chain = isChain(sp.chaine) ? sp.chaine : null;
  const cat = (CATS.some((c) => c.key === sp.cat) ? sp.cat : null) as Category | null;
  let items: MarketItem[] | null = null;
  let failed = false;
  try {
    items = await loadList(key, chain, cat);
  } catch (err) {
    console.error("accueil", err);
    failed = true;
  }
  const memeTab = key === "tiers-etat";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Solde et dépôt (connecté) ; bienvenue (visiteur) */}
      <div className="empty:hidden">
        <CashBar />
      </div>
      <GuestOnly>
        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-electrique/35 via-[#4a49f0]/25 to-[#7b3fe0]/30 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] p-5 text-white sm:p-7">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-[radial-gradient(closest-side,rgb(255_210_63/0.5),transparent)]" />
          <h1 className="relative font-[family-name:var(--font-display)] text-3xl leading-tight font-extrabold sm:text-4xl">
            Crée. Trade. <span className="sticker text-nuit">Gagne ensemble.</span>
          </h1>
          <p className="relative mt-3 max-w-md text-[15px] text-white/85">
            Le launchpad et l&apos;appli de trading du peuple : lance ton mème en une minute, trade toutes les cryptos et suis ce que tes amis achètent.
          </p>
          <Link href="/verifier" className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-bold">
            🛡 Règles 100 % vérifiables sur la blockchain →
          </Link>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <Link href="/portefeuille" className="btn-fete min-h-11 px-6">
              Commencer
            </Link>
            <Link href="/lancer" className="inline-flex min-h-11 items-center rounded-full bg-white/15 px-6 font-bold">
              Créer un mème
            </Link>
          </div>
        </section>
      </GuestOnly>

      {/* La petite bande : les plus gros gains du moment */}
      <Suspense fallback={null}>
        <TopTradersBand />
      </Suspense>

      {/* La une des journaux : l'actu du jour, à transformer en mème en un clic */}
      <Suspense fallback={<div className="h-[26rem] animate-pulse rounded-3xl bg-surface" />}>
        <HomeBuzz />
      </Suspense>

      {/* La liste des tokens */}
      <section id="tokens" className="scroll-mt-20 space-y-3">
        <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1" aria-label="Listes de tokens">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/?tri=${t.key}`}
              scroll={false}
              aria-current={key === t.key ? "page" : undefined}
              className={`chip shrink-0 ${key === t.key ? "chip-active" : ""}`}
            >
              {t.key === "liste" ? (
                <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-label="Ma liste">
                  <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
                </svg>
              ) : (
                t.label
              )}
            </Link>
          ))}
        </nav>

        {key === "tendances" && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Link href="/?tri=tendances" scroll={false} className={`chip shrink-0 py-1.5 ${!chain ? "chip-active" : ""}`}>
              Toutes
            </Link>
            {(Object.keys(CHAINS) as ChainId[]).map((c) => (
              <Link key={c} href={`/?tri=tendances&chaine=${c}`} scroll={false} className={`chip shrink-0 gap-1.5 py-1.5 ${chain === c ? "chip-active" : ""}`}>
                <span className="size-2 rounded-full" style={{ background: CHAINS[c].color }} />
                {CHAINS[c].label}
              </Link>
            ))}
          </div>
        )}

        {key === "bourse" && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Link href="/?tri=bourse" scroll={false} className={`chip shrink-0 py-1.5 ${!cat ? "chip-active" : ""}`}>
              Tout
            </Link>
            {CATS.map((c) => (
              <Link key={c.key} href={`/?tri=bourse&cat=${c.key}`} scroll={false} className={`chip shrink-0 py-1.5 ${cat === c.key ? "chip-active" : ""}`}>
                {c.label}
              </Link>
            ))}
          </div>
        )}

        {key === "liste" ? (
          <WatchlistView />
        ) : key === "nouveaux" ? (
          <NewTokensLive />
        ) : failed || !items ? (
          <p className="rounded-3xl bg-surface p-8 text-center text-sm text-muted-foreground">Liste momentanément indisponible. Réessaie dans une minute.</p>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-white/[0.08]">
            <p className="font-bold">{memeTab ? "Aucun mème ici pour l'instant" : "Rien à afficher"}</p>
            {memeTab && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">Le premier mème de Tiers-État reste à créer. Ce sera peut-être le tien.</p>
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
            Tokens « DEX payé » et boostés sur DexScreener, avec de l&apos;activité, classés par volume des 6 dernières heures. Ni vérifiés ni recommandés par Tiers-État.
          </p>
        )}
        {key === "bourse" && (
          <p className="px-1 text-xs text-muted-foreground">
            Contrats perpétuels avec effet de levier, alimentés par Hyperliquid : actions, indices, matières premières, devises et pré-IPO. Très risqué : les pertes sont multipliées par le levier.
          </p>
        )}
        {key === "cryptos" && <p className="px-1 text-xs text-muted-foreground">Les plus grandes cryptos du monde (CoinGecko), hors stablecoins. Pour information.</p>}
      </section>
    </div>
  );
}
