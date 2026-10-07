import "server-only";
import { XMLParser } from "fast-xml-parser";
import { isSensitive } from "@/lib/buzz-suggest";

export type BuzzItem = {
  id: string;
  source: string;
  kind: "media" | "reddit" | "crypto";
  title: string;
  excerpt: string;
  url: string;
  /** Vignette fournie par le flux (ou image de partage de l'article), absente si introuvable. */
  image: string | null;
  publishedAt: string;
};

const SOURCES: { name: string; url: string; kind: BuzzItem["kind"] }[] = [
  { name: "franceinfo", url: "https://www.francetvinfo.fr/titres.rss", kind: "media" },
  { name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml", kind: "media" },
  { name: "20 Minutes", url: "https://www.20minutes.fr/feeds/rss-une.xml", kind: "media" },
  { name: "Libération", url: "https://www.liberation.fr/arc/outboundfeeds/rss-all/?outputType=xml", kind: "media" },
  { name: "Le Figaro", url: "https://www.lefigaro.fr/rss/figaro_actualites.xml", kind: "media" },
  { name: "BFMTV", url: "https://www.bfmtv.com/rss/news-24-7/", kind: "media" },
  // Actu crypto française (memecoins, personnages viraux, lancements…)
  { name: "Cointribune", url: "https://www.cointribune.com/feed/", kind: "crypto" },
  { name: "Journal du Coin", url: "https://journalducoin.com/feed/", kind: "crypto" },
  { name: "Cryptoast", url: "https://cryptoast.fr/feed/", kind: "crypto" },
  { name: "Coin Academy", url: "https://coinacademy.fr/feed/", kind: "crypto" },
  // L'API JSON de Reddit refuse les serveurs ; le flux Atom public reste accessible.
  { name: "r/france", url: "https://www.reddit.com/r/france/hot/.rss", kind: "reddit" },
];

const PER_SOURCE = 8;
const TTL_MS = 10 * 60 * 1000;
const UA = "Mozilla/5.0 (compatible; TiersEtatBot/1.0; +https://tiersetat.vercel.app)";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text" });

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", hellip: "…", euro: "€", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç" };

/** Texte brut : retire balises HTML, décode les entités courantes, compacte les espaces. */
export function cleanText(value: unknown): string {
  const raw = typeof value === "object" && value !== null ? String((value as Record<string, unknown>)["#text"] ?? "") : String(value ?? "");
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** Date ISO tolérante : une date de flux illisible ne doit pas faire planter l'agrégation. */
function safeDate(value: string): string {
  const t = Date.parse(value);
  return new Date(Number.isNaN(t) ? Date.now() : t).toISOString();
}

const asArray = <T,>(v: T | T[] | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

/** Garde uniquement une URL https plausible (pas de data:, pas de http en clair). */
function httpsUrl(value: unknown): string | null {
  const url = typeof value === "string" ? value.replace(/&amp;/g, "&").trim() : "";
  return /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
}

/** Vignette d'un article : enclosure, media:content, media:thumbnail, puis première balise <img> du contenu. */
export function extractImage(entry: Record<string, unknown>): string | null {
  type Media = { "@url"?: string; "@type"?: string };
  for (const e of asArray(entry.enclosure as Media | Media[])) {
    if (!e["@type"] || e["@type"].startsWith("image")) {
      const url = httpsUrl(e["@url"]);
      if (url) return url;
    }
  }
  for (const key of ["media:content", "media:thumbnail"]) {
    for (const m of asArray(entry[key] as Media | Media[])) {
      const url = httpsUrl(m["@url"]);
      if (url) return url;
    }
  }
  for (const key of ["description", "content", "content:encoded"]) {
    const v = entry[key];
    const html = typeof v === "object" && v !== null ? String((v as Record<string, unknown>)["#text"] ?? "") : String(v ?? "");
    const src = html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').match(/<img[^>]+src="([^"]+)"/i)?.[1];
    const url = httpsUrl(src);
    if (url) return url;
  }
  return null;
}

/** Image de partage (og:image) d'un article, pour les flux qui n'en fournissent pas. */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const head = (await res.text()).slice(0, 200_000);
    const tag = head.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)?.[0];
    return httpsUrl(tag?.match(/content=["']([^"']+)["']/i)?.[1]);
  } catch {
    return null;
  }
}

/** Extrait les éléments d'un flux RSS 2.0 ou Atom (pur, testable). */
export function parseFeed(xml: string, source: string, kind: BuzzItem["kind"]): BuzzItem[] {
  const doc = parser.parse(xml);
  const rssItems = asArray(doc?.rss?.channel?.item);
  const atomEntries = asArray(doc?.feed?.entry);
  const items: BuzzItem[] = [];

  for (const it of rssItems) {
    const url = cleanText(it.link);
    const title = cleanText(it.title);
    if (!url || !title) continue;
    items.push({
      id: url, source, kind, title, url,
      excerpt: cleanText(it.description).slice(0, 220),
      image: extractImage(it),
      publishedAt: safeDate(cleanText(it.pubDate)),
    });
  }
  for (const e of atomEntries) {
    const links = asArray(e.link) as Array<{ "@href"?: string; "@rel"?: string }>;
    const url = links.find((l) => !l["@rel"] || l["@rel"] === "alternate")?.["@href"] ?? links[0]?.["@href"] ?? "";
    const title = cleanText(e.title);
    if (!url || !title) continue;
    items.push({
      id: url, source, kind, title, url,
      excerpt: "",
      image: extractImage(e),
      publishedAt: safeDate(cleanText(e.updated ?? e.published)),
    });
  }
  return items;
}

/** Fils de discussion récurrents de r/france, sans intérêt comme mème. */
function isNoise(item: BuzzItem) {
  return item.kind === "reddit" && /^(forum libre|\[meta\]|mega ?thread|fil de discussion)/i.test(item.title);
}

let cache: { items: BuzzItem[]; at: number; failed: string[] } | null = null;

/** Actus agrégées (cache 10 min). Une source en panne n'empêche pas l'affichage des autres. */
export async function getBuzz(): Promise<{ items: BuzzItem[]; failed: string[]; updatedAt: string }> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return { items: cache.items, failed: cache.failed, updatedAt: new Date(cache.at).toISOString() };
  }
  const failed: string[] = [];
  const results = await Promise.all(
    SOURCES.map(async (s) => {
      try {
        const res = await fetch(s.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(String(res.status));
        const parsed = parseFeed(await res.text(), s.name, s.kind);
        // Une page de blocage (anti-robots) répond parfois 200 sans aucun article
        if (parsed.length === 0) throw new Error("flux vide");
        return parsed
          .filter((i) => !isNoise(i) && !isSensitive(`${i.title} ${i.excerpt}`))
          .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
          .slice(0, PER_SOURCE);
      } catch {
        failed.push(s.name);
        return [];
      }
    }),
  );
  const seen = new Set<string>();
  const items = results
    .flat()
    .filter((i) => {
      const key = i.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  // Articles sans vignette dans le flux (ex. Libération) : on lit l'image de partage de la page.
  await Promise.all(items.filter((i) => !i.image && i.kind !== "reddit").map(async (i) => (i.image = await fetchOgImage(i.url))));
  cache = { items, failed, at: Date.now() };
  return { items, failed, updatedAt: new Date(cache.at).toISOString() };
}
