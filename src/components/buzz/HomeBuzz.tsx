import Link from "next/link";
import { BuzzImage } from "@/components/buzz/BuzzImage";
import { HEAT_STYLE } from "@/components/buzz/TrendList";
import { getBuzz } from "@/lib/buzz";
import { timeAgo } from "@/lib/buzz-links";
import { computeTrends, itemHeat, keywords } from "@/lib/buzz-trends";

const HEAT_RANK = { brulant: 0, chaud: 1, tiede: 2 } as const;

/** Accueil, « À la une » : le sujet le plus chaud du moment et les actus chaudes, en liste verticale. */
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
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`flex items-center gap-2 text-xs font-medium uppercase tracking-widest ${style.text}`}>
            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
            À la une · l&apos;actu du jour
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
            <span className="ml-3 align-middle font-mono text-sm font-normal text-muted-foreground">
              {top.sources} médias · {top.articles} articles
            </span>
          </h2>
        </div>
        <div className="flex gap-2">
          <Link href="/ca-buzz" className="btn-ghost">
            Toute l&apos;actu
          </Link>
        </div>
      </div>

      {/* Liste verticale : l'article phare en grand, puis les suivants en lignes compactes */}
      <div className="surface divide-y divide-ligne overflow-hidden">
        {hot.slice(0, 6).map(({ item }, index) =>
          index === 0 ? (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group block">
              <div className="relative">
                <BuzzImage src={item.image} source={item.source} priority />
                <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-0.5 text-xs font-medium text-lueur">{item.source}</span>
              </div>
              <div className="space-y-1 p-4">
                <p className="text-xs text-muted-foreground">{timeAgo(item.publishedAt)}</p>
                <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
              </div>
            </a>
          ) : (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 p-3 hover:bg-white/[0.04]">
              <div className="w-28 shrink-0 overflow-hidden rounded-xl sm:w-36">
                <BuzzImage src={item.image} source={item.source} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {item.source} · {timeAgo(item.publishedAt)}
                </p>
                <h3 className="mt-0.5 line-clamp-3 text-sm font-semibold leading-snug">{item.title}</h3>
              </div>
            </a>
          ),
        )}
      </div>
    </section>
  );
}
