/** Le rédacteur en chef automatique de la Gazette : dates d'édition et gros titres (pur, testé). */

/** Premier jour de Tiers-État : l'édition n° 1. */
const FIRST_EDITION = Date.UTC(2026, 9, 6);

export function editionNumber(now = Date.now()): number {
  return Math.max(1, Math.floor((now - FIRST_EDITION) / 86_400_000) + 1);
}

/** « Samedi 10 octobre 2026 · 14 h 32 » (heure de Paris) */
export function editionLine(now = Date.now()): string {
  const d = new Date(now);
  const day = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const [h, m] = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).split(":");
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${Number(h)} h ${m}`;
}

const pctFr = (n: number) => `${Math.round(Math.abs(n)).toLocaleString("fr-FR")} %`;

/** Gros titre d'un mème Tiers-État selon où il en est. */
export function memeHeadline(m: { ticker: string; progress: number; migrated: boolean; volumeSol: number; trades: number }): { kicker: string; title: string } {
  const t = `$${m.ticker}`;
  if (m.migrated) return { kicker: "Victoire", title: `${t} a pris la Bastille` };
  if (m.progress >= 80) return { kicker: "Dernière ligne droite", title: `${t} aux portes de la Bastille` };
  if (m.progress >= 50) return { kicker: "En marche", title: `${t} marche sur la Bastille` };
  if (m.trades >= 20) return { kicker: "Effervescence", title: `${t} déchaîne la foule` };
  if (m.volumeSol > 0) return { kicker: "À la une", title: `${t} mène la danse` };
  return { kicker: "Nouveau", title: `${t} vient d'être frappé` };
}

/** Gros titre d'un token Solana selon sa variation sur 24 h. */
export function moverHeadline(symbol: string, change24: number | null): { kicker: string; title: string } {
  const s = symbol.startsWith("$") ? symbol : `$${symbol}`;
  if (change24 === null) return { kicker: "Le marché", title: `${s} attire tous les regards` };
  if (change24 >= 1000) return { kicker: "Folie", title: `${s} explose de ${pctFr(change24)}` };
  if (change24 >= 50) return { kicker: "Envolée", title: `${s} s'envole de ${pctFr(change24)}` };
  if (change24 >= 0) return { kicker: "Le marché", title: `${s} grimpe de ${pctFr(change24)}` };
  if (change24 <= -50) return { kicker: "Krach", title: `${s} s'effondre de ${pctFr(change24)}` };
  return { kicker: "Le marché", title: `${s} recule de ${pctFr(change24)}` };
}

/** Gros titre d'un sujet d'actualité. */
export function topicHeadline(label: string, sources: number): { kicker: string; title: string } {
  const sujet = label.charAt(0).toUpperCase() + label.slice(1);
  return { kicker: "Ça brûle", title: `« ${sujet} » fait parler ${sources} médias` };
}
