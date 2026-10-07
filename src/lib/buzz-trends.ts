import type { BuzzItem } from "@/lib/buzz";

/** Chaleur d'un sujet : nombre de sources distinctes (médias + r/france) qui en parlent en même temps. */
export type Heat = "brulant" | "chaud" | "tiede";

export type Trend = {
  /** Clé normalisée (minuscules, sans accent) et forme affichée la plus fréquente. */
  key: string;
  label: string;
  sources: number;
  articles: number;
  heat: Heat;
};

const STOPWORDS = new Set(
  (
    "alors apres avant avec aussi autre autres avoir bien cette ceux chez comme comment contre dans depuis deux devant donc dont elle elles encore entre etre fait faire faut font hier jour jours leur leurs lors mais meme moins notre nous paris plus pour pourquoi quand quel quelle quels quoi sans selon sera sont sous tous tout toute toutes tres trois vers veut voici vous ans annee france francais francaise premier premiere nouveau nouvelle mort morts selon direct video photos apres-midi samedi dimanche lundi mardi mercredi jeudi vendredi heure heures minutes contre-attaque face cela celui celle grand grande petit petite annonce annonces accuse accusee accuses appelle demande demandent affirme estime explique lance lancent ouvre reagit revient raconte devient pourrait doit doivent prend veulent visee vise suite fois apres cette avoir mois semaine politique gouvernement live"
  ).split(" "),
);

const normalize = (w: string) => w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Mots marquants d'un titre (≥ 4 lettres, hors mots vides), dédoublonnés. */
export function keywords(title: string): { key: string; label: string }[] {
  const seen = new Set<string>();
  const out: { key: string; label: string }[] = [];
  for (const raw of title.split(/[^\p{L}\p{N}'-]+/u)) {
    const word = raw.replace(/^[ldjmnst]'/i, "").replace(/^-+|-+$/g, "");
    const key = normalize(word);
    if (key.length < 4 || /^\d+$/.test(key) || STOPWORDS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: word });
  }
  return out;
}

export function heatOf(sources: number): Heat {
  return sources >= 4 ? "brulant" : sources >= 2 ? "chaud" : "tiede";
}

/**
 * Sujets du moment : un mot est une « narrative » quand plusieurs sources distinctes le reprennent.
 * Classement par nombre de sources, puis par nombre d'articles.
 */
export function computeTrends(items: Pick<BuzzItem, "title" | "source">[], limit = 12): Trend[] {
  const map = new Map<string, { labels: Map<string, number>; sources: Set<string>; articles: number }>();
  for (const item of items) {
    for (const { key, label } of keywords(item.title)) {
      const entry = map.get(key) ?? { labels: new Map(), sources: new Set(), articles: 0 };
      entry.labels.set(label, (entry.labels.get(label) ?? 0) + 1);
      entry.sources.add(item.source);
      entry.articles += 1;
      map.set(key, entry);
    }
  }
  return [...map.entries()]
    .filter(([, e]) => e.sources.size >= 2)
    .map(([key, e]) => ({
      key,
      // Forme la plus fréquente, en préférant la version avec majuscule (nom propre)
      label: [...e.labels.entries()].sort((a, b) => b[1] - a[1] || Number(/^\p{Lu}/u.test(b[0])) - Number(/^\p{Lu}/u.test(a[0])))[0][0],
      sources: e.sources.size,
      articles: e.articles,
      heat: heatOf(e.sources.size),
    }))
    .sort((a, b) => b.sources - a.sources || b.articles - a.articles)
    .slice(0, limit);
}

/** Chaleur d'un article : celle de son sujet le plus repris. */
export function itemHeat(title: string, trends: Trend[]): Trend | null {
  const keys = new Set(keywords(title).map((k) => k.key));
  return trends.find((t) => keys.has(t.key)) ?? null;
}
