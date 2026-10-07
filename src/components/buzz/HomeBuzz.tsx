import Link from "next/link";
import { AutoScroller } from "@/components/buzz/AutoScroller";
import { BuzzImage } from "@/components/buzz/BuzzImage";
import { HEAT_STYLE } from "@/components/buzz/TrendList";
import { getBuzz } from "@/lib/buzz";
import { launchHref, timeAgo } from "@/lib/buzz-links";
import { suggestName, suggestTicker } from "@/lib/buzz-suggest";
import { computeTrends, itemHeat, keywords } from "@/lib/buzz-trends";

const HEAT_RANK = { brulant: 0, chaud: 1, tiede: 2 } as const;

/** Accueil : le sujet le plus brûlant du moment et les actus chaudes, en cartes qui défilent. */
export async function HomeBuzz() {
  const items = await getBuzz().then((b) => b.items, () => []);
  const trends = computeTrends(items, 16);
  const top = trends[0];
  if (!top) return null;

  // Articles du sujet n°1 d'abord, puis les autres actus chaudes ; uniquement avec image
  const hot = items
    .map((item) => ({ item, trend: itemHeat(item.title, trends) }))
    .filter(({ item, trend }) => item.image && trend && trend.heat !== "tiede")
    .sort((a, b) => {
      const aTop = keywords(a.item.title).some((k) => k.key === top.key) ? 0 : 1;
      const bTop = keywords(b.item.title).some((k) => k.key === top.key) ? 0 : 1;
      return aTop - bTop || HEAT_RANK[a.trend!.heat] - HEAT_RANK[b.trend!.heat] || b.item.publishedAt.localeCompare(a.item.publishedAt);
    })
    .slice(0, 12);
  if (hot.length === 0) return null;
  const style = HEAT_STYLE[top.heat];
  // Second mot-clé présent dans la majorité des articles du sujet (ex. « Mobilisation · lycéens »)
  const topItems = items.filter((i) => keywords(i.title).some((k) => k.key === top.key));
  const companion = trends
    .slice(1)
    .find((t) => topItems.filter((i) => keywords(i.title).some((k) => k.key === t.key)).length * 2 >= topItems.length);
  const title = [top, companion].filter(Boolean).map((t) => t!.label.charAt(0).toUpperCase() + t!.label.slice(1)).join(" · ");
  const topArticle = hot.find(({ item }) => keywords(item.title).some((k) => k.key === top.key))?.item;
  // Ticker : le mot-clé le plus court qui tient en entier (≤ 10 lettres), sinon le premier tronqué
  const words = [companion, top].filter(Boolean).map((t) => t!.label);
  const tickerWord = words.filter((w) => w.length <= 10).sort((a, b) => a.length - b.length)[0] ?? top.label;
  const memeHref = `/lancer?${new URLSearchParams({
    nom: suggestName(title.replace(" · ", " ")),
    ticker: suggestTicker(tickerWord),
    description: `Le sujet qui brûle en France : ${title}, repris par ${top.sources} médias.`,
    ...(topArticle ? { source: topArticle.url } : {}),
  })}`;

  return (
    <section className="-mt-12 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`flex items-center gap-2 text-xs font-medium uppercase tracking-widest ${style.text}`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            Ça brûle en France
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
            <span className="ml-3 align-middle font-mono text-sm font-normal text-muted-foreground">
              {top.sources} médias · {top.articles} articles
            </span>
          </h2>
        </div>
        <div className="flex gap-2">
          <Link href={memeHref} className="btn-primary">
            Frapper le mème
          </Link>
          <Link href="/ca-buzz" className="btn-ghost">
            Toute l&apos;actu
          </Link>
        </div>
      </div>

      <AutoScroller className="-mx-4 snap-x px-4">
        {hot.map(({ item, trend }, index) => {
          const heat = HEAT_STYLE[trend!.heat];
          return (
            <article key={item.id} className="surface group flex w-72 shrink-0 snap-start flex-col overflow-hidden sm:w-80">
              <a href={item.url} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden className="relative block">
                <BuzzImage src={item.image} source={item.source} priority={index < 2} />
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-lueur backdrop-blur">{item.source}</span>
                <span className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium backdrop-blur ${heat.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${heat.dot}`} />
                  {heat.label}
                </span>
              </a>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-xs text-muted-foreground">{timeAgo(item.publishedAt)}</p>
                <h3 className="mt-1 line-clamp-3 text-sm font-medium leading-snug">{item.title}</h3>
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                    Lire ↗
                  </a>
                  <Link href={launchHref(item)} className="btn-primary px-3 py-1.5 text-xs">
                    En faire un token
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </AutoScroller>
    </section>
  );
}
