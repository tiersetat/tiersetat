import Link from "next/link";
import { Suspense } from "react";
import { CashBar } from "@/components/market/CashBar";
import { MarketRow, type MarketItem } from "@/components/market/MarketRow";
import { WatchlistView } from "@/components/market/WatchlistView";
import { GuestOnly } from "@/components/layout/GuestOnly";
import { TopTradersBand } from "@/components/rank/TopTradersBand";
import { cryptos, solanaTrending } from "@/lib/market-data";
import { solUsd } from "@/lib/feed";
import { listTokens, type Tab, type TokenCard } from "@/lib/tokens";
import { TOTAL_SUPPLY } from "@/lib/traders";

/** Onglets de la liste : nos mèmes (launchpad), puis tout le marché. */
const TABS = [
  { key: "liste", label: "⭐" },
  { key: "tendances", label: "Tendances" },
  { key: "nouveaux", label: "Nouveaux" },
  { key: "bastille", label: "Bientôt DEX" },
  { key: "cryptos", label: "Cryptos" },
  { key: "solana", label: "Solana 🔥" },
  { key: "bourse", label: "Actions · Forex" },
] as const;
type Key = (typeof TABS)[number]["key"];
const parseKey = (v: unknown): Key | null => (TABS.some((t) => t.key === v) ? (v as Key) : null);

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

async function loadList(key: Key): Promise<MarketItem[] | null> {
  if (key === "liste" || key === "bourse") return null;
  if (key === "cryptos") return cryptos();
  if (key === "solana") return solanaTrending();
  const [memes, sol] = await Promise.all([listTokens(key as Tab), solUsd().catch(() => null)]);
  return memes.map((m) => fromMeme(m, sol));
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const asked = parseKey((await searchParams).tri);
  let key: Key = asked ?? "tendances";
  let items: MarketItem[] | null = null;
  let failed = false;
  try {
    items = await loadList(key);
    // Pas encore de mème actif : on ouvre l'appli sur les cryptos plutôt que sur une liste vide
    if (!asked && items?.length === 0) {
      key = "cryptos";
      items = await loadList(key);
    }
  } catch (err) {
    console.error("accueil", err);
    failed = true;
  }
  const memeTab = key === "tendances" || key === "nouveaux" || key === "bastille";

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

        {key === "liste" ? (
          <WatchlistView />
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
        {(key === "cryptos" || key === "solana") && (
          <p className="px-1 text-xs text-muted-foreground">Données publiques (DexScreener, GeckoTerminal), pour information. Ce n&apos;est pas une recommandation.</p>
        )}
      </section>
    </div>
  );
}
