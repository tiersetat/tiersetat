import { PLATFORM_CURVE } from "@/lib/solana/platform";

/**
 * « La quête du frappeur » : le jeu du QG. Chaque personnage apprend une étape au débutant,
 * de l'idée jusqu'à la promotion de son token, puis vérifie par une question.
 * Les chiffres viennent des réglages de la plateforme : ils restent justes si ceux-ci changent.
 */
export type Reponse = { texte: string; bonne?: boolean; /** Ce que le personnage répond si on choisit cette réponse */ explication: string };

export type Mission = {
  /** Personnage qui donne la mission (id de QG_TEAM) */
  id: string;
  titre: string;
  /** Ce que dit le personnage, bulle par bulle */
  dialogue: string[];
  question: string;
  reponses: Reponse[];
  /** Passer à l'action dans l'appli */
  action: { label: string; href: string };
};

const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const antiBot = PLATFORM_CURVE.antiBot.startingFeeBps / 100;
const frais = PLATFORM_CURVE.tradingFeeBps / 100;

export const MISSIONS: Mission[] = [
  {
    id: "jacques",
    titre: "Bienvenue au QG",
    dialogue: [
      "Salut, citoyen ! Ici, tout le monde peut créer son propre token en une minute. On appelle ça frapper un mème.",
      "Mon équipe va t'apprendre les 5 étapes : trouver l'idée, frapper le token, inspirer confiance, le faire vivre sur le marché, puis le faire connaître.",
      "Pour commencer, il te faut juste un compte. Google ou e-mail suffit : ton portefeuille est créé pour toi, et c'est toi seul qui le contrôles.",
    ],
    question: "De quoi as-tu besoin pour créer un token sur Tiers-État ?",
    reponses: [
      { texte: "D'un compte et d'un peu de SOL", bonne: true, explication: "Exactement ! Un compte, un peu de SOL pour les frais, et ton idée. Va voir Camille, elle t'attend pour trouver la bonne idée." },
      { texte: "D'être développeur", explication: "Pas du tout ! Aucune ligne de code : un formulaire, une image, et c'est frappé. Réessaie !" },
      { texte: "D'une autorisation de ma banque", explication: "Non, ta banque n'a rien à voir là-dedans : tout se passe sur la blockchain Solana. Réessaie !" },
    ],
    action: { label: "Bien démarrer", href: "/demarrer" },
  },
  {
    id: "camille",
    titre: "Trouver l'idée",
    dialogue: [
      "Édition spéciale ! Un bon mème, c'est une idée que tout le monde comprend en deux secondes.",
      "Mon astuce : regarde « Ça buzz ». Ce sont les sujets que tous les médias reprennent en même temps. Un sujet chaud, c'est un public déjà là.",
      "Ensuite, un nom court et drôle, et un ticker de 2 à 10 lettres facile à retenir, comme $BAGUETTE.",
    ],
    question: "Quelle idée a le plus de chances de marcher ?",
    reponses: [
      { texte: "Un clin d'œil drôle à l'actu du moment", bonne: true, explication: "Bravo ! L'humour et l'actualité, c'est le carburant des mèmes. Maintenant, file à la forge : Louis d'Or va t'apprendre à le frapper." },
      { texte: "Un nom compliqué que personne ne comprend", explication: "Aïe : si on ne comprend pas ton mème en deux secondes, on passe au suivant. Réessaie !" },
      { texte: "Copier un token qui existe déjà", explication: "Mauvaise idée : une copie inspire méfiance et n'a pas d'histoire à elle. Réessaie !" },
    ],
    action: { label: "Voir ce qui buzze", href: "/ca-buzz" },
  },
  {
    id: "louis",
    titre: "Frapper le token",
    dialogue: [
      "À la forge ! Il te faut un nom (32 caractères maximum), un ticker, une image (4 Mo maximum) et une petite histoire.",
      `Frapper coûte ${fr(PLATFORM_CURVE.poolCreationFeeSol)} SOL, c'est tout. Ton token naît avec ${fr(PLATFORM_CURVE.totalSupply / 1e9)} milliard d'unités, toutes mises en vente sur la courbe : pas de prévente, pas de part cachée.`,
      `Astuce : tu peux faire ton premier achat dans la même transaction. Pendant la première minute, des frais anti-robots (${antiBot} % qui redescendent à ${frais} %) protègent ton lancement… mais pas contre toi : ton premier achat reste au tarif normal.`,
    ],
    question: "Combien coûte la création d'un token ?",
    reponses: [
      { texte: `${fr(PLATFORM_CURVE.poolCreationFeeSol)} SOL`, bonne: true, explication: "Clang ! Une pièce de plus. Avant de crier ton mème sur les toits, Madame Livre va t'expliquer comment inspirer confiance." },
      { texte: "100 €", explication: "Bien moins que ça ! Juste de quoi éviter le spam. Réessaie !" },
      { texte: "1 SOL", explication: `Non, c'est ${fr(PLATFORM_CURVE.poolCreationFeeSol)} SOL seulement. Réessaie !` },
    ],
    action: { label: "Ouvrir la forge", href: "/lancer" },
  },
  {
    id: "livre",
    titre: "Inspirer confiance",
    dialogue: [
      "Avant d'acheter, les gens regardent une chose : peut-on te faire confiance ?",
      "Sur Tiers-État, personne ne peut créer de nouveaux tokens ni bloquer les portefeuilles, et la liquidité est verrouillée à vie après la Bastille. Tout se vérifie sur la page Fiabilité.",
      "Ce qui dépend de toi : si tu revends vite ce que tu as acheté, un badge « Créateur a vendu X % » apparaît sur ton token. Tout le monde le voit.",
      `Et rester te rapporte : à chaque échange de ton token, ${PLATFORM_CURVE.creatorTradingFeePercentage} % des frais de trading (après la part du protocole Meteora) te reviennent.`,
    ],
    question: "Qu'est-ce qui rassure le plus les acheteurs ?",
    reponses: [
      { texte: "Un créateur qui garde ses tokens et reste présent", bonne: true, explication: "Comptes vérifiés ! La confiance se gagne en restant. Marianne va maintenant te montrer comment ton token vit sur le marché." },
      { texte: "Un créateur qui revend tout dans la première minute", explication: "Au contraire : c'est le signal qui fait fuir tout le monde, et le badge le montre. Réessaie !" },
      { texte: "Promettre que le prix va faire x100", explication: "Surtout pas : promettre des gains est interdit, et ces messages sont refusés automatiquement. Réessaie !" },
    ],
    action: { label: "Voir la page Fiabilité", href: "/verifier" },
  },
  {
    id: "marianne",
    titre: "Le marché et la Bastille",
    dialogue: [
      "Ton token vit sur une courbe : chaque achat fait monter le prix, chaque vente le fait baisser. Tout le monde achète aux mêmes conditions.",
      `Il démarre à ${fr(PLATFORM_CURVE.initialMarketCapSol)} SOL de capitalisation. Quand la courbe est remplie, vers ${fr(PLATFORM_CURVE.migrationMarketCapSol)} SOL, il « prend la Bastille » : il part tout seul sur un DEX, avec une liquidité verrouillée.`,
      "La barre de progression sur la page de ton token montre où tu en es. C'est un bel objectif à partager avec ta communauté.",
    ],
    question: "Que se passe-t-il quand la courbe atteint 100 % ?",
    reponses: [
      { texte: "Le token part sur un DEX, liquidité verrouillée", bonne: true, explication: "Ça bouge sur le Marché ! Dernière étape : Gavroche va t'apprendre à faire connaître ton mème." },
      { texte: "Le token disparaît", explication: "Non, c'est même l'inverse : il grandit et part sur un DEX. Réessaie !" },
      { texte: "Le créateur récupère tout l'argent", explication: "Impossible : la liquidité est verrouillée à vie, personne ne peut la retirer. Réessaie !" },
    ],
    action: { label: "Voir le marché", href: "/?tri=tiers-etat#tokens" },
  },
  {
    id: "gavroche",
    titre: "Le faire connaître",
    dialogue: [
      "Oyez, oyez ! Un mème que personne ne connaît ne vit pas. À toi de crier les nouvelles !",
      "Un : partage-le sur X avec le bouton « Partager sur X » de sa page, une belle image est créée toute seule. Deux : anime sa communauté et épingle tes annonces. Trois : invite tes amis.",
      "Mais attention : pas de « x100 garanti » ni de « on achète tous à 20 h ». Les promesses de gains et les achats coordonnés sont interdits, et refusés automatiquement.",
    ],
    question: "Quel message de promo est le bon ?",
    reponses: [
      { texte: "« Mon mème $BAGUETTE est né ce matin, venez découvrir son histoire ! »", bonne: true, explication: "Voilà un vrai crieur ! Honnête, drôle, et ça donne envie. Tu as terminé la quête !" },
      { texte: "« x100 garanti, achetez avant qu'il soit trop tard ! »", explication: "Interdit : c'est une promesse de gains. Ce message serait refusé. Réessaie !" },
      { texte: "« Tout le monde achète à 20 h pile ! »", explication: "Interdit : c'est un achat coordonné, une forme de manipulation du marché. Réessaie !" },
    ],
    action: { label: "Voir les communautés", href: "/fil?vue=communautes" },
  },
];

/** Clé du navigateur où l'avancée de la quête est gardée (simple confort : rien n'en dépend côté serveur). */
export const QUETE_KEY = "te_qg_quete_v1";
