import type { Metadata } from "next";
import Link from "next/link";
import { BuzzImage } from "@/components/buzz/BuzzImage";
import { HEAT_STYLE, TrendList } from "@/components/buzz/TrendList";
import { getBuzz } from "@/lib/buzz";
import { launchHref, timeAgo, trendLaunchHref } from "@/lib/buzz-links";
import { computeTrends, itemHeat, keywords, type Trend } from "@/lib/buzz-trends";

export const metadata: Metadata = { title: "Ça buzz en France — Tiers-État" };

const HEAT_RANK = { brulant: 0, chaud: 1, tiede: 2 } as const;
/** Sujets brûlants d'abord ; un article sans sujet repris passe en dernier. */
const heatRank = (t: Trend | null) => (t ? HEAT_RANK[t.heat] : 3);

export default async function CaBuzzPage({ searchParams }: PageProps<"/ca-buzz">) {
  const { source, sujet, tri, categorie } = await searchParams;
  const { items, failed } = await getBuzz();
  const trends = computeTrends(items, 16);
  const sources = [...new Set(items.map((i) => i.source))];

  const activeSource = typeof source === "string" && sources.includes(source) ? source : null;
  const cryptoOnly = categorie === "crypto";
  const activeTrend = typeof sujet === "string" ? (trends.find((t) => t.key === sujet) ?? null) : null;
  const byHeat = tri !== "recent";

  const enriched = items.map((item) => ({ item, trend: itemHeat(item.title, trends) }));
  const shown = enriched
    .filter(({ item }) => !activeSource || item.source === activeSource)
    .filter(({ item }) => !cryptoOnly || item.kind === "crypto")
    .filter(({ item }) => !activeTrend || keywords(item.title).some((k) => k.key === activeTrend.key))
    .sort((a, b) =>
      byHeat
        ? heatRank(a.trend) - heatRank(b.trend) || (b.trend?.sources ?? 0) - (a.trend?.sources ?? 0) || b.item.publishedAt.localeCompare(a.item.publishedAt)
        : b.item.publishedAt.localeCompare(a.item.publishedAt),
    );

  const query = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const next = { source: activeSource, sujet: activeTrend?.key ?? null, tri: byHeat ? null : "recent", categorie: cryptoOnly ? "crypto" : null, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/ca-buzz?${qs}` : "/ca-buzz";
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ça buzz en France</h1>
          <p className="max-w-2xl text-muted-foreground">Les sujets que tout le monde reprend en même temps. Plus c&apos;est rouge, plus ça chauffe. Un clic pour en faire un token.</p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          {(["brulant", "chaud", "tiede"] as const).map((h) => (
            <span key={h} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${HEAT_STYLE[h].dot}`} />
              {HEAT_STYLE[h].label}
            </span>
          ))}
        </div>
      </header>

      <TrendList trends={trends} active={activeTrend?.key} />

      {activeTrend && (
        <section className="surface flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className={`text-xs font-medium uppercase tracking-widest ${HEAT_STYLE[activeTrend.heat].text}`}>Sujet {HEAT_STYLE[activeTrend.heat].label.toLowerCase()}</p>
            <p className="mt-1 text-2xl font-semibold">{activeTrend.label}</p>
            <p className="text-sm text-muted-foreground">
              Repris par {activeTrend.sources} sources, {activeTrend.articles} articles.{" "}
              <Link href={query({ sujet: null })} className="underline-offset-4 hover:text-foreground hover:underline">
                Voir tous les sujets
              </Link>
            </p>
          </div>
          <Link href={trendLaunchHref(activeTrend, shown[0]?.item)} className="btn-primary">
            Frapper le mème « {activeTrend.label} »
          </Link>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Filtrer par source">
          <Link href={query({ source: null, categorie: null })} className={`chip ${!activeSource && !cryptoOnly ? "chip-active" : ""}`}>
            Toutes les sources
          </Link>
          <Link href={query({ source: null, categorie: "crypto" })} className={`chip ${cryptoOnly && !activeSource ? "chip-active" : ""}`}>
            ₿ Crypto
          </Link>
          {sources.map((s) => (
            <Link key={s} href={query({ source: s })} className={`chip ${activeSource === s ? "chip-active" : ""}`}>
              {s}
            </Link>
          ))}
        </nav>
        <nav className="flex gap-2" aria-label="Trier">
          <Link href={query({ tri: null })} className={`chip ${byHeat ? "chip-active" : ""}`}>
            Les plus chauds
          </Link>
          <Link href={query({ tri: "recent" })} className={`chip ${!byHeat ? "chip-active" : ""}`}>
            Les plus récents
          </Link>
        </nav>
      </div>

      {shown.length === 0 ? (
        <p className="surface p-10 text-center text-muted-foreground">Aucune actu disponible pour l&apos;instant. Reviens dans quelques minutes.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ item, trend }, index) => {
            const heat = trend ? HEAT_STYLE[trend.heat] : null;
            return (
              <li
                key={item.id}
                className={`surface surface-hover group flex flex-col overflow-hidden ${trend?.heat === "brulant" ? "ring-1 ring-vente/40" : trend?.heat === "chaud" ? "ring-1 ring-amber-400/25" : ""}`}
              >
                <a href={item.url} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden className="relative block">
                  <BuzzImage src={item.image} source={item.source} priority={index < 3} />
                  <span className={`absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium backdrop-blur ${item.kind === "reddit" ? "text-vente" : item.kind === "crypto" ? "text-amber-300" : "text-lueur"}`}>
                    {item.source}
                  </span>
                  {trend && heat && (
                    <span className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium backdrop-blur ${heat.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${heat.dot}`} />
                      {heat.label} · {trend.sources} sources
                    </span>
                  )}
                </a>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs text-muted-foreground">
                    {timeAgo(item.publishedAt)}
                    {trend && (
                      <>
                        {" · "}
                        <Link href={query({ sujet: trend.key })} className={`font-medium hover:underline ${heat?.text}`}>
                          #{trend.label}
                        </Link>
                      </>
                    )}
                  </p>
                  <h2 className="mt-1.5 font-medium leading-snug">{item.title}</h2>
                  {item.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                      Lire l&apos;article ↗
                    </a>
                    <Link href={launchHref(item)} className="btn-primary px-3.5 py-1.5 text-xs">
                      En faire un token
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="space-y-1 text-xs text-muted-foreground/80">
        <p>
          Titres, liens et vignettes issus des flux RSS publics des médias et de r/france, mis à jour toutes les 10 minutes. La chaleur d&apos;un sujet
          correspond au nombre de sources différentes qui en parlent. Les articles et images restent la propriété de leurs auteurs : pour ton mème,
          utilise ta propre image.
        </p>
        <p>Satire bienvenue, usurpation interdite : pas de faux token « officiel » d&apos;une personnalité ou d&apos;un média.</p>
        {failed.length > 0 && <p>Sources momentanément indisponibles : {failed.join(", ")}.</p>}
      </footer>
    </div>
  );
}
