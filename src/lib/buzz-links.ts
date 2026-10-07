import type { BuzzItem } from "@/lib/buzz";
import { suggestName, suggestTicker } from "@/lib/buzz-suggest";
import type { Trend } from "@/lib/buzz-trends";

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
export function timeAgo(iso: string) {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  return Math.abs(hours) < 48 ? rtf.format(hours, "hour") : rtf.format(Math.round(hours / 24), "day");
}

export function launchHref(item: BuzzItem) {
  const params = new URLSearchParams({
    nom: suggestName(item.title),
    ticker: suggestTicker(item.title),
    description: `Inspiré de l'actu (${item.source}) : « ${item.title} »`.slice(0, 500),
    source: item.url,
  });
  return `/lancer?${params}`;
}

/** Mème d'un sujet entier : nom et ticker tirés du mot-clé, description citant les sources. */
export function trendLaunchHref(trend: Trend, top: BuzzItem | undefined) {
  const params = new URLSearchParams({
    nom: suggestName(trend.label.charAt(0).toUpperCase() + trend.label.slice(1)),
    ticker: suggestTicker(trend.label),
    description: `Le sujet du moment : ${trend.label}, repris par ${trend.sources} sources.`.slice(0, 500),
  });
  if (top) params.set("source", top.url);
  return `/lancer?${params}`;
}
