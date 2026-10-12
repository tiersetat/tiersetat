/**
 * Règles des QG (la communauté de chaque mème), partagées client et serveur.
 * La promotion est libre ; deux choses sont refusées automatiquement :
 * les promesses de gains (loi influenceurs, AMF) et l'organisation d'achats coordonnés (manipulation de marché).
 */

/** Minuscules, sans accents, ponctuation → espaces (les chiffres restent : « x100 » doit rester lisible). */
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const GAIN_PROMISE = [
  /\bx ?\d{2,}\b/, // « x100 », « x 50 »
  /\b(gains?|profits?|rendement|benefices?|plus value) (garanti|garantis|garantie|garanties|assure|assures|surs?)\b/,
  /\b(garanti|garantie|assure|100 pour ?cent|100 sur) (gain|profit|rendement|benefice)/,
  /\b(tu vas|vous allez|on va tous|on va) (devenir riches?|etre riches?|faire fortune|t enrichir|vous enrichir|millionnaires?)\b/,
  /\b(sans risque|zero risque|aucun risque)\b/,
  /\b(to the moon garanti|moon garanti|lambo garanti)\b/,
];

const COORDINATED = [
  /\b(on|tous|tout le monde|everyone) (achete|achetons|buy|pump|pumpe|pumpons|monte|fait monter)\b.*\b(a|at|vers|ensemble|en meme temps|meme heure|\d{1,2} ?h)\b/,
  /\b(pump|pumpons|pumper) (ensemble|a \d{1,2} ?h|ce soir|demain|maintenant)\b/,
  /\b(achat|achats) (groupe|groupes|coordonne|coordonnes|synchronise|synchronises)\b/,
  /\b(ne vendez pas|personne ne vend|interdit de vendre|on vend tous)\b/,
];

export type QgVerdict = { ok: true } | { ok: false; reason: string };

export function checkQgMessage(body: string): QgVerdict {
  const t = ` ${normalize(body)} `;
  if (GAIN_PROMISE.some((r) => r.test(t))) {
    return { ok: false, reason: "Pas de promesse de gains dans le QG : c'est interdit (loi influenceurs). Parle du mème, pas du profit." };
  }
  if (COORDINATED.some((r) => r.test(t))) {
    return { ok: false, reason: "Pas d'achats ou de ventes organisés en groupe : c'est de la manipulation de marché. Fais vivre le mème autrement." };
  }
  return { ok: true };
}

export const QG_DISCLAIMER = "Les memecoins sont très risqués. Rien ici n'est un conseil financier.";
