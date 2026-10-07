/** Suggestions de nom / ticker à partir d'un titre d'actu (modifiables par l'utilisateur). */

const STOPWORDS = new Set(
  "le la les un une des du de d l et ou a au aux en dans sur pour par avec sans ce cette ces son sa ses leur leurs qui que quoi dont est sont ont pas plus moins tres tout tous apres avant entre contre selon comme mais donc car il elle ils elles on nous vous je tu se ne y fait faire etre avoir deja encore aussi".split(" "),
);

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** Nom ≤ 32 octets (limite Metaplex), coupé proprement entre deux mots. */
export function suggestName(title: string): string {
  const clean = title.replace(/\s+/g, " ").replace(/[«»"“”]/g, "").trim();
  if (byteLength(clean) <= 32) return clean;
  let out = "";
  for (const word of clean.split(" ")) {
    const next = out ? `${out} ${word}` : word;
    if (byteLength(next) > 32) break;
    out = next;
  }
  return (out || clean.slice(0, 16)).replace(/[,:;.!?–-]+$/, "").trim();
}

/** Ticker : le mot le plus marquant du titre, en majuscules sans accent (2 à 10 caractères). */
export function suggestTicker(title: string): string {
  const words = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()) && !/^\d+$/.test(w));
  const best = words.sort((a, b) => b.length - a.length)[0] ?? "MEME";
  return best.slice(0, 10);
}

/**
 * Sujets graves (drames, victimes réelles) : on ne propose pas d'en faire un mème.
 * Volontairement large : mieux vaut écarter une actu de trop qu'un mème sur un drame.
 */
const SENSITIVE = new RegExp(
  "\\b(" +
    [
      "morts?", "mortes?", "decede", "deces", "tue", "tues", "tuee", "tuees", "meurtre", "assassin\\w*", "homicide", "feminicide",
      "suicide\\w*", "viol", "viols", "violee?s?", "sexuel\\w*", "pedocrimin\\w*", "agression\\w*", "agresse\\w*", "victimes?",
      "attentat\\w*", "terroris\\w*", "otages?", "massacre\\w*", "genocide", "fusillade", "noyade", "noye\\w*", "accident\\w*",
      "drame\\w*", "tragedie", "deuil", "funerailles", "obseques", "enfant\\w* (blesse|disparu|mort)\\w*", "disparition", "inceste",
      "cancer", "blesse\\w*", "bombardement\\w*", "frappes?", "frappres?", "missile\\w*", "guerre\\w*", "drones?", "armee\\w*",
    ].join("|") +
    ")\\b",
);

export function isSensitive(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return SENSITIVE.test(normalized);
}
