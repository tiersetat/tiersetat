/**
 * Les Défis des communautés : règles partagées par le navigateur et le serveur.
 * Pas d'argent : les récompenses sont symboliques (badge, mise en avant). Tout défi est validé à la main avant publication.
 */
import { isSensitive } from "./buzz-suggest";
import { checkQgMessage } from "./qg";

export const DEFI_MAX_OPEN = 3;
export const DEFI_DURATIONS = [3, 7, 14] as const;

/** Ce qui est toujours refusé, même si un administrateur passait à côté. */
const FORBIDDEN = new RegExp(
  "\\b(" +
    [
      "bless\\w*", "suicid\\w*", "mourir", "tuer", "frapper", "battre", "bagarre", "arme\\w*", "couteau\\w*", "feu", "incendi\\w*", "brul\\w*",
      "drogu\\w*", "alcool", "ivre", "nu", "nue", "nus", "nues", "seins", "sexe\\w*", "mineur\\w*", "enfant\\w*",
      "vol", "voler", "vole", "tag\\w*", "graffiti\\w*", "vandal\\w*", "degrad\\w*", "casser", "illegal\\w*", "interdit\\w*",
      "harcel\\w*", "insult\\w*", "humili\\w*", "doxx\\w*", "adresse", "domicile", "suivre", "traquer",
      "rails?", "autoroute\\w*", "toit\\w*", "danger\\w*", "risque\\w*", "cascade\\w*",
    ].join("|") +
    ")\\b",
);

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ");

export type DefiCheck = { ok: true } | { ok: false; reason: string };

export function checkDefi(title: string, rules: string): DefiCheck {
  const t = `${title} ${rules}`;
  if (title.trim().length < 5) return { ok: false, reason: "Donne un titre au défi (5 caractères au moins)." };
  if (rules.trim().length < 10) return { ok: false, reason: "Explique ce qu'il faut faire (10 caractères au moins)." };
  if (FORBIDDEN.test(` ${normalize(t)} `) || isSensitive(t)) {
    return { ok: false, reason: "Défi refusé : rien de dangereux, d'illégal, de dégradant ni qui vise une personne. Propose quelque chose de créatif et sans risque." };
  }
  const qg = checkQgMessage(t);
  if (!qg.ok) return qg;
  return { ok: true };
}

/** Lien de participation : une publication sur un grand réseau (on n'héberge aucun fichier). */
const ALLOWED = /^https:\/\/(www\.)?(x\.com|twitter\.com|tiktok\.com|vm\.tiktok\.com|instagram\.com|youtube\.com|youtu\.be)\/\S+$/i;
export function checkEntryUrl(url: string): DefiCheck {
  return ALLOWED.test(url.trim()) ? { ok: true } : { ok: false, reason: "Colle le lien de ta publication sur X, TikTok, Instagram ou YouTube." };
}

export const DEFI_RULES_TEXT =
  "Récompense symbolique : le badge « Gagnant de défi » et la mise en avant dans la communauté. Rien de dangereux, d'illégal, de dégradant ni qui vise une vraie personne. Pas de promesse de gains. Chaque défi est vérifié avant publication.";
