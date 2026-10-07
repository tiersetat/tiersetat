/**
 * Modération automatique des mèmes (nom, ticker, description).
 * Partagée client (retour immédiat) et serveur (contrôle qui fait foi).
 */

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "€": "e",
};

/** Minuscules, sans accents, leet-speak décodé, ponctuation → espaces. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0-9@$€]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Un token ne peut jamais se présenter comme « officiel » (usurpation d'identité). */
const OFFICIAL_PATTERN =
  /\b(officiel|officielle|officiels|official|certifie|certifiee|verifie|verifiee|verified|authentique|vrai compte|real account)\b/;

export type ModerationResult = { ok: true } | { ok: false; reason: string };

export function moderate(texts: string[], blockedWords: string[]): ModerationResult {
  const normalized = normalizeText(texts.join(" "));
  const padded = ` ${normalized} `;
  const squashed = normalized.replace(/ /g, "");

  if (OFFICIAL_PATTERN.test(normalized)) {
    return {
      ok: false,
      reason:
        "Interdit de se présenter comme « officiel » ou « vérifié » : pas d'usurpation d'identité.",
    };
  }

  for (const raw of blockedWords) {
    const word = normalizeText(raw);
    if (!word) continue;
    const hit = word.includes(" ")
      ? padded.includes(` ${word} `) || squashed.includes(word.replace(/ /g, ""))
      : padded.includes(` ${word} `) || (word.length >= 6 && squashed.includes(word));
    if (hit) {
      return { ok: false, reason: "Ce contenu contient un terme interdit (haine ou discrimination)." };
    }
  }
  return { ok: true };
}
