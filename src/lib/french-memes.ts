import { isSensitive } from "@/lib/buzz-suggest";

/**
 * Onglet « Mèmes français » : repérage automatique des memecoins à thème français sur le marché,
 * avec des garde-fous. Rien n'est vérifié à la main ni recommandé : c'est affiché comme tel.
 */

/** Au-delà de ce nombre de tokens lancés, le créateur est considéré comme un lanceur en série. */
export const MAX_DEV_MINTS = 50;
/** Minimum de détenteurs pour apparaître. */
export const MIN_HOLDERS = 100;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Mots du thème français dans un nom ou un ticker. */
const THEME = /\b(france|french|francais\w*|paris\w*|baguettes?|croissants?|fromages?|camembert|gaulois\w*|marseille|lyon|bordeaux|toulouse|bretagne|breton\w*|frenchie|cocorico|coq|tour eiffel|eiffel|vin rouge|escargots?|bonjour|oui oui|sacre bleu|ratatouille|chouquette|pain au chocolat|chocolatine|beret|petanque)\b/;
/** Mots-outils très français : une description qui en contient plusieurs est écrite en français. */
const STOP = /\b(le|la|les|des|du|une|est|pour|avec|pas|qui|que|sur|dans|nous|vous|mais|aussi|tout|notre|votre|cette|sont|ete|plus)\b/g;
/** Médias français : un lien vers eux signale une actu française. */
const MEDIA = /(\.fr\b|lemonde|lefigaro|liberation|bfmtv|francetvinfo|leparisien|ouest-france|20minutes|tf1info|lexpress|nouvelobs|huffingtonpost\.fr|konbini|brut\.media|topito|legorafi|journaldugeek|jeuxvideo\.com|allocine|serieously|dexerto\.fr)/;

export function looksFrench(t: { name: string; symbol: string; description?: string | null; links?: string[] }): boolean {
  if (THEME.test(norm(`${t.name} ${t.symbol}`))) return true;
  if (t.links?.some((l) => MEDIA.test(l.toLowerCase()))) return true;
  const d = norm(t.description ?? "");
  return (d.match(STOP)?.length ?? 0) >= 5;
}

/** Personnalités et mouvements politiques : on n'affiche jamais un token qui les vise. */
const POLITICS = /\b(macron|le ?pen|marine|bardella|melenchon|zemmour|sarkozy|hollande|attal|retailleau|ciotti|ruffin|bayrou|barnier|darmanin|borne|philippe|lfi|insoumis\w*|rassemblement national|reconquete|front national|trotsk\w*|communis\w*|fascis\w*|nazi\w*|antifa|gilets? jaunes?|trump|biden|elysee|president\w*|ministre\w*|depute\w*|election\w*|gauche|droite)\b/;
/** Violences et appels à la haine (émeutes, incendies, « la France est morte »…). */
const VIOLENCE = /\b(riots?|emeutes?|on fire|burn\w*|brule\w*|is dead|dead|kill\w*|war|revolte\w*|casseurs?|hate|haine)\b/;
/** Insultes racistes, sexistes, homophobes : jamais affichées. */
const SLURS = /(nigg|negr|bougnoul|youpin|pd\b|pede|tapette|salope|pute|bitch|fag|retard|chink|kike)/;

/** Raison d'exclure un token (ou null s'il peut apparaître), avant les contrôles de créateur et de détenteurs. */
export function exclusionReason(t: { name: string; symbol: string; description?: string | null }): string | null {
  const text = norm(`${t.name} ${t.symbol} ${t.description ?? ""}`);
  if (SLURS.test(text)) return "insulte";
  if (POLITICS.test(text)) return "politique";
  if (VIOLENCE.test(text)) return "violence";
  if (isSensitive(text)) return "sujet grave";
  return null;
}

/** Contrôles du créateur et de la communauté (données Jupiter). */
export function passesChecks(t: { holders: number | null; devMints: number | null }): boolean {
  return (t.holders ?? 0) >= MIN_HOLDERS && t.devMints !== null && t.devMints <= MAX_DEV_MINTS;
}
