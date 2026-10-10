import Link from "next/link";
import { Suspense } from "react";
import { CashBar } from "@/components/market/CashBar";
import { MarketRow, type MarketItem } from "@/components/market/MarketRow";
import { WatchlistView } from "@/components/market/WatchlistView";
import { GuestOnly } from "@/components/layout/GuestOnly";
import { TopTradersBand } from "@/components/rank/TopTradersBand";
import { CHAINS, dexPaidTrending, isChain, topCryptos, type ChainId } from "@/lib/market-feeds";
import { NewTokensLive } from "@/components/market/NewTokensLive";
import { HomeBuzz } from "@/components/buzz/HomeBuzz";
import { solUsd } from "@/lib/feed";
import { listTokens, type Tab, type TokenCard } from "@/lib/tokens";
import { TOTAL_SUPPLY } from "@/lib/traders";

/** Onglets de la liste : tout le marché (multi-blockchains), puis nos mèmes (launchpad). */
const TABS = [
  { key: "liste", label: "⭐" },
  { key: "tendances", label: "Tendances" },
  { key: "nouveaux", label: "Nouveaux" },
  { key: "cryptos", label: "Cryptos" },
  { key: "tiers-etat", label: "Tiers-État" },
  { key: "bourse", label: "Actions · Forex" },
] as const;
type Key = (typeof TABS)[number]["key"];
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

async function loadList(key: Key, chain: ChainId | null): Promise<MarketItem[] | null> {
  if (key === "liste" || key === "bourse" || key === "nouveaux") return null;
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
  let items: MarketItem[] | null = null;
  let failed = false;
  try {
    items = await loadList(key, chain);
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
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-electrique via-[#4a49f0] to-[#7b3fe0] p-5 text-white sm:p-7">
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
        <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.08] px-4" aria-label="Listes de tokens">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/?tri=${t.key}`}
              scroll={false}
              aria-current={key === t.key ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-[15px] font-bold transition ${key === t.key ? "border-soleil text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
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

        {key === "liste" ? (
          <WatchlistView />
        ) : key === "nouveaux" ? (
          <NewTokensLive />
        ) : key === "bourse" ? (
          <div className="rounded-3xl bg-surface p-6 text-center ring-1 ring-white/[0.08]">
            <p className="text-3xl" aria-hidden>
              📈
            </p>
            <p className="mt-2 text-lg font-extrabold">Actions, indices, forex, matières premières et pré-IPO</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Bientôt sur Tiers-État : Tesla, l&apos;or, l&apos;euro-dollar, le Nasdaq ou les futures introductions en bourse, depuis le même solde que tes mèmes.
            </p>
          </div>
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
        {key === "cryptos" && <p className="px-1 text-xs text-muted-foreground">Les plus grandes cryptos du monde (CoinGecko), hors stablecoins. Pour information.</p>}
      </section>
    </div>
  );
}
