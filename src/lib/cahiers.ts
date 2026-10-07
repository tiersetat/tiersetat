/** Cahiers de doléances : barème des points (pur, testé). Les points n'ont aucune valeur monétaire. */

export type CahierStats = {
  wallet: string;
  tokens_created: number;
  volume_sol: number;
  tokens_traded: number;
  comments: number;
  followers: number;
  has_clan: boolean;
  creator_volume_sol: number;
  /** Invités ayant créé ou échangé au moins un token (absent avant la migration des invitations) */
  active_referrals?: number;
  /** Parmi les 100 Fondateurs */
  founder?: boolean;
  /** Victoires au concours du Mème de la semaine */
  weekly_wins?: number;
};

type Regle = { key: string; label: string; detail: string; per: number; cap: number; value: (s: CahierStats) => number };

/**
 * Plafonds : en bêta, les SOL de test sont gratuits, donc chaque catégorie est bornée
 * pour qu'aucune action répétée en boucle ne suffise à dominer le classement.
 */
export const REGLES: Regle[] = [
  { key: "frappe", label: "Mèmes frappés", detail: "100 points par token créé", per: 100, cap: 2_000, value: (s) => s.tokens_created },
  { key: "succes", label: "Succès de tes mèmes", detail: "30 points par SOL échangé par les autres sur tes tokens", per: 30, cap: 6_000, value: (s) => s.creator_volume_sol },
  { key: "echanges", label: "Volume échangé", detail: "20 points par SOL acheté ou vendu", per: 20, cap: 2_000, value: (s) => s.volume_sol },
  { key: "diversite", label: "Mèmes soutenus", detail: "10 points par token différent échangé", per: 10, cap: 500, value: (s) => s.tokens_traded },
  { key: "invitations", label: "Invités actifs", detail: "50 points par personne invitée qui crée ou échange un mème", per: 50, cap: 2_500, value: (s) => s.active_referrals ?? 0 },
  { key: "abonnes", label: "Abonnés", detail: "10 points par abonné", per: 10, cap: 2_000, value: (s) => s.followers },
  { key: "parole", label: "Prises de parole", detail: "5 points par commentaire", per: 5, cap: 200, value: (s) => s.comments },
  { key: "semaine", label: "Mème de la semaine", detail: "500 points par victoire au concours hebdomadaire", per: 500, cap: 5_000, value: (s) => s.weekly_wins ?? 0 },
  { key: "fondateur", label: "Fondateur", detail: "250 points pour les 100 premiers à créer ou échanger un mème", per: 250, cap: 250, value: (s) => (s.founder ? 1 : 0) },
  { key: "clan", label: "Membre d'un clan", detail: "50 points en rejoignant ta région", per: 50, cap: 50, value: (s) => (s.has_clan ? 1 : 0) },
];

export const RANGS = [
  { min: 0, titre: "Sujet" },
  { min: 100, titre: "Citoyen" },
  { min: 500, titre: "Député" },
  { min: 1_500, titre: "Tribun" },
  { min: 4_000, titre: "Révolutionnaire" },
  { min: 8_000, titre: "Héros de la Bastille" },
] as const;

export type Cahier = { wallet: string; points: number; rang: string; detail: { key: string; label: string; points: number; cap: number }[] };

export function rangOf(points: number): string {
  return [...RANGS].reverse().find((r) => points >= r.min)!.titre;
}

export function scoreCahier(s: CahierStats): Cahier {
  const detail = REGLES.map((r) => ({ key: r.key, label: r.label, cap: r.cap, points: Math.min(r.cap, Math.floor(Number(r.value(s)) * r.per)) }));
  const points = detail.reduce((sum, d) => sum + d.points, 0);
  return { wallet: s.wallet, points, rang: rangOf(points), detail };
}

/** Classement décroissant ; à égalité, l'ordre d'arrivée est conservé. */
export function rankCahiers(rows: CahierStats[]): Cahier[] {
  return rows
    .map(scoreCahier)
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points);
}
