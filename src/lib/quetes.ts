/**
 * Chapitre 2 du QG, « Faire grandir ton mème » : des quêtes réelles, vérifiées sur les données du mème
 * (aucune réponse à cocher). Chaque personnage du QG guide une étape. Aucune récompense en argent :
 * la progression, des conseils, et la fierté d'avancer. Rien n'encourage à acheter son propre mème
 * (le créateur ne compte jamais comme détenteur) ni à revendre vite.
 */
export type QuestStats = {
  hasToken: boolean;
  descriptionLength: number;
  hasX: boolean;
  announcements: number;
  /** détenteurs hors créateur */
  holders: number;
  ageHours: number;
  /** part revendue par le créateur (null = inconnu) */
  soldPct: number | null;
  curve: number;
  migrated: boolean;
  referrals: number;
};

export type QuestState = { done: boolean; progress: number; label: string };
export type Quest = {
  id: string;
  /** personnage du QG qui guide la quête */
  member: string;
  titre: string;
  conseil: string;
  action: { label: string; href: (mint: string | null) => string };
  check: (s: QuestStats) => QuestState;
};

const count = (have: number, need: number, unit: string): QuestState => ({
  done: have >= need,
  progress: Math.min(1, have / need),
  label: `${Math.min(have, need)}/${need} ${unit}`,
});

export const QUESTS: Quest[] = [
  {
    id: "frappe",
    member: "louis",
    titre: "Frappe ton premier mème",
    conseil: "Un nom court, un ticker facile à retenir, une image qui fait rire. Une minute à la forge, et ton mème existe.",
    action: { label: "Ouvrir la forge", href: () => "/lancer" },
    check: (s) => ({ done: s.hasToken, progress: s.hasToken ? 1 : 0, label: s.hasToken ? "Frappé" : "À frapper" }),
  },
  {
    id: "histoire",
    member: "camille",
    titre: "Raconte son histoire",
    conseil: "Les gens achètent une histoire, pas un logo. Écris en quelques lignes d'où vient ton mème et pourquoi il fait rire (30 caractères au moins).",
    action: { label: "Voir la page du mème", href: (m) => (m ? `/token/${m}` : "/lancer") },
    check: (s) => count(Math.min(s.descriptionLength, 30), 30, "caractères"),
  },
  {
    id: "annonce",
    member: "gavroche",
    titre: "Ouvre sa communauté",
    conseil: "Publie ta première annonce dans la communauté de ton mème : ce qui arrive, un défi, un merci aux premiers détenteurs. Elle sera épinglée en haut.",
    action: { label: "Ouvrir la communauté", href: (m) => (m ? `/communaute/${m}` : "/fil?vue=communautes") },
    check: (s) => count(s.announcements, 1, "annonce"),
  },
  {
    id: "x",
    member: "gavroche",
    titre: "Relie son compte X",
    conseil: "Un compte X dédié à ton mème, c'est là que tout se partage. Ajoute son lien lors de la création, puis partage chaque étape avec le bouton « Partager sur X ».",
    action: { label: "Voir la page du mème", href: (m) => (m ? `/token/${m}` : "/lancer") },
    check: (s) => ({ done: s.hasX, progress: s.hasX ? 1 : 0, label: s.hasX ? "Relié" : "Pas encore de lien X" }),
  },
  {
    id: "cercle",
    member: "marianne",
    titre: "Premier cercle : 10 détenteurs",
    conseil: "Tes 10 premiers détenteurs sont tes premiers ambassadeurs. Parle-en à tes amis, dans ta communauté, sur X. Toi, tu ne comptes pas : ce sont les autres qui font vivre ton mème.",
    action: { label: "Inviter des amis", href: () => "/portefeuille" },
    check: (s) => count(s.holders, 10, "détenteurs"),
  },
  {
    id: "parole",
    member: "livre",
    titre: "Tenir parole : 24 h sans revendre",
    conseil: "Un créateur qui reste, c'est ce qui rassure le plus. Garde tes tokens au moins 24 h après le lancement (moins de 10 % revendus) : ton badge de confiance reste au vert.",
    action: { label: "Voir la page Fiabilité", href: () => "/verifier" },
    check: (s) => {
      const kept = s.soldPct === null || s.soldPct < 10;
      if (!kept) return { done: false, progress: 0, label: `${Math.round(s.soldPct ?? 0)} % revendus` };
      return { done: s.hasToken && s.ageHours >= 24, progress: Math.min(1, s.ageHours / 24), label: `${Math.min(24, Math.floor(s.ageHours))}/24 h` };
    },
  },
  {
    id: "course",
    member: "marianne",
    titre: "Entre dans la course : 20 détenteurs",
    conseil: "À 20 détenteurs, ton mème peut gagner le Mème de la semaine (la plus grosse capitalisation le dimanche soir) et la Une de l'accueil.",
    action: { label: "Voir le classement", href: () => "/semaine" },
    check: (s) => count(s.holders, 20, "détenteurs"),
  },
  {
    id: "amis",
    member: "jacques",
    titre: "Rassemble : invite 3 amis",
    conseil: "Partage ton lien d'invitation : chaque ami qui crée son compte grâce à toi compte. Plus le Tiers-État est nombreux, plus ton mème a de chances.",
    action: { label: "Mon lien d'invitation", href: () => "/portefeuille" },
    check: (s) => count(s.referrals, 3, "amis"),
  },
  {
    id: "mi-chemin",
    member: "marianne",
    titre: "Mi-chemin vers la Bastille",
    conseil: "La courbe se remplit avec les achats de la communauté. À 50 %, partage la barre de progression : c'est un objectif que tout le monde comprend.",
    action: { label: "Voir la courbe", href: (m) => (m ? `/token/${m}` : "/lancer") },
    check: (s) => ({ done: s.migrated || s.curve >= 50, progress: s.migrated ? 1 : Math.min(1, s.curve / 50), label: `${Math.round(s.migrated ? 100 : s.curve)} % de la courbe` }),
  },
  {
    id: "bastille",
    member: "jacques",
    titre: "Prends la Bastille",
    conseil: "Courbe remplie : ton mème part tout seul sur un DEX, avec une liquidité verrouillée à vie. C'est la consécration.",
    action: { label: "Voir la page du mème", href: (m) => (m ? `/token/${m}` : "/lancer") },
    check: (s) => ({ done: s.migrated, progress: s.migrated ? 1 : Math.min(1, s.curve / 100), label: s.migrated ? "Bastille prise !" : `${Math.round(s.curve)} %` }),
  },
];

/** Les quêtes avec leur état, et la prochaine à faire (dans l'ordre). */
export function questsOf(s: QuestStats) {
  const list = QUESTS.map((q) => ({ q, state: q.check(s) }));
  return { list, done: list.filter((x) => x.state.done).length, next: list.find((x) => !x.state.done)?.q.id ?? null };
}
