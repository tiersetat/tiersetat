/**
 * Le QG : une seule grande image où l'équipe travaille déjà à ses postes (peinte avec le décor).
 * Chaque personnage est une zone cliquable posée sur lui ; les positions sont en fractions de l'image (0 → 1).
 * x = centre du personnage, y = sol sous ses pieds, h et w = hauteur et largeur de la zone.
 */
export type QgMember = {
  id: string;
  nom: string;
  role: string;
  pourquoi: string;
  phrase: string;
  href: string;
  cta: string;
  x: number;
  y: number;
  h: number;
  w: number;
  /** Cadre autour du personnage et de son poste [gauche, haut, droite, bas], là où se pose sa vidéo animée */
  cadre: [number, number, number, number];
  /** Petite phrase qui apparaît de temps en temps au-dessus de sa tête, pendant qu'il travaille */
  bulle: string;
  /** Couleur du badge (classe Tailwind du thème) */
  color: string;
};

/** Nom d'une pièce : écrit sur un panneau de l'image, ou en enseigne flottante quand il n'y a pas de panneau. */
export type QgRoom = { label: string; x: number; y: number; href: string; enseigne?: boolean };

/** Proportions de l'image (largeur / hauteur). */
export const QG_RATIO = 2172 / 724;

export const QG_DECOR = "/images/qg/decor.webp";

/** Passe à true quand le décor et les personnages sont dans public/images/qg : sinon la page présente l'équipe sans la scène. */
export const QG_SCENE_READY = true;

/** Personnages dont la vidéo animée est prête (public/images/qg/anim-<id>.mp4) : elle se pose sur l'image, bords fondus. */
export const QG_VIDEOS: string[] = [];

export const QG_TEAM: QgMember[] = [
  {
    id: "jacques",
    nom: "Jacques Bonhomme",
    role: "Chef du QG",
    pourquoi:
      "C'est le vrai surnom donné au paysan français sous l'Ancien Régime : l'homme du peuple, le Tiers-État en personne.",
    phrase: "Bienvenue au QG, citoyen ! Ici, la création monétaire est rendue au peuple.",
    href: "/demarrer",
    cta: "Bien démarrer",
    x: 0.387,
    y: 0.8,
    h: 0.45,
    w: 0.085,
    cadre: [0.33, 0.3, 0.5, 0.86],
    bulle: "Prêt à frapper un token ?",
    color: "text-soleil",
  },
  {
    id: "marianne",
    nom: "Marianne",
    role: "Le Marché",
    pourquoi: "Le symbole de la République.",
    phrase: "Les cours bougent ? Je les suis toutes, en direct.",
    href: "/?tri=cryptos#tokens",
    cta: "Voir le marché",
    x: 0.078,
    y: 0.81,
    h: 0.47,
    w: 0.1,
    cadre: [0, 0.3, 0.24, 0.86],
    bulle: "Ça bouge sur le Marché !",
    color: "text-ciel",
  },
  {
    id: "camille",
    nom: "Camille",
    role: "À la une",
    pourquoi:
      "En clin d'œil à Camille Desmoulins, le journaliste qui a appelé les Parisiens à se soulever le 12 juillet 1789, deux jours avant la Bastille.",
    phrase: "Édition spéciale ! Les sujets qui brûlent en France, tout frais sortis de la presse.",
    href: "/ca-buzz",
    cta: "Lire les nouvelles",
    x: 0.251,
    y: 0.815,
    h: 0.53,
    w: 0.08,
    cadre: [0.2, 0.26, 0.33, 0.86],
    bulle: "Édition spéciale !",
    color: "text-bonbon",
  },
  {
    id: "louis",
    nom: "Louis d'Or",
    role: "La Frappe",
    pourquoi:
      "Le louis d'or était la pièce en or du roi. Ici, c'est le peuple qui frappe sa propre monnaie.",
    phrase: "Ici, c'est le peuple qui frappe la monnaie. Une idée ? On la frappe ensemble.",
    href: "/lancer",
    cta: "Créer un mème",
    x: 0.582,
    y: 0.82,
    h: 0.52,
    w: 0.1,
    cadre: [0.5, 0.27, 0.72, 0.86],
    bulle: "Clang ! Une pièce de plus.",
    color: "text-soleil",
  },
  {
    id: "livre",
    nom: "Madame Livre",
    role: "Le Coffre",
    pourquoi: "La livre était la monnaie de la France en 1789.",
    phrase: "Chaque règle se vérifie sur la blockchain. Trois clés, et aucune ne suffit seule.",
    href: "/verifier",
    cta: "Vérifier le coffre",
    x: 0.785,
    y: 0.8,
    h: 0.42,
    w: 0.09,
    cadre: [0.7, 0.26, 0.87, 0.86],
    bulle: "Comptes vérifiés.",
    color: "text-achat",
  },
  {
    id: "gavroche",
    nom: "Gavroche",
    role: "Le Café",
    pourquoi:
      "Le gamin de Paris que tout le monde connaît. Il vient des Misérables, une époque plus tardive, mais il incarne l'esprit du crieur de rue.",
    phrase: "Oyez, oyez ! Venez trinquer avec les créateurs et les traders au café !",
    href: "/fil",
    cta: "Aller au café",
    x: 0.917,
    y: 0.81,
    h: 0.49,
    w: 0.075,
    cadre: [0.87, 0.28, 1, 0.86],
    bulle: "Oyez, oyez !",
    color: "text-vente",
  },
];

/** Noms écrits sur les panneaux suspendus (laissés vides dans l'image). */
export const QG_ROOMS: QgRoom[] = [
  { label: "Le Marché", x: 0.106, y: 0.175, href: "/?tri=cryptos#tokens" },
  { label: "À la une", x: 0.27, y: 0.175, href: "/ca-buzz" },
  { label: "Le QG", x: 0.433, y: 0.175, href: "/demarrer" },
  { label: "La Frappe", x: 0.617, y: 0.178, href: "/lancer" },
  { label: "Le Coffre", x: 0.78, y: 0.178, href: "/verifier" },
  { label: "Le Café", x: 0.906, y: 0.178, href: "/fil" },
];

export const memberImage = (id: string) => `/images/qg/${id}.webp`;
