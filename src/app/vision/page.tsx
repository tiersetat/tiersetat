import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Vision — Tiers-État",
  description: "Tiers-État construit l'écosystème financier du peuple : frapper, échanger, payer et décider ensemble, sur Solana.",
};

type Brique = { nom: string; role: string; texte: string; statut: "En ligne" | "En construction" | "À venir" };

const BRIQUES: Brique[] = [
  {
    nom: "La Frappe",
    role: "Le launchpad",
    texte: "Chacun crée sa monnaie en une minute, selon les mêmes règles pour tous. Le créateur touche 70 % des frais. C'est la porte d'entrée de l'écosystème.",
    statut: "En ligne",
  },
  {
    nom: "Les Cahiers de doléances",
    role: "Le programme de points",
    texte: "Créer, échanger, inviter, faire vivre son clan : chaque action utile est inscrite dans ton cahier. Les premiers bâtisseurs seront reconnus.",
    statut: "En ligne",
  },
  {
    nom: "$TIERS",
    role: "Le token de l'écosystème",
    texte: "Le jeton qui relie toutes les briques : réductions de frais, mise en avant, droit de vote à l'Assemblée. Pensé pour être distribué d'abord à la communauté, pas vendu à des initiés.",
    statut: "À venir",
  },
  {
    nom: "L'Assemblée",
    role: "La gouvernance",
    texte: "Les détenteurs votent : mèmes mis en avant, nouvelles fonctions, utilisation du Trésor. Le peuple décide, comme en 1789.",
    statut: "En construction",
  },
  {
    nom: "Le Trésor du peuple",
    role: "Le fonds commun",
    texte: "Une part des frais de la plateforme alimente un trésor public sur la blockchain, visible par tous, pour financer créateurs, clans et événements.",
    statut: "À venir",
  },
  {
    nom: "La Bourse",
    role: "L'échange avancé",
    texte: "Un terminal rapide pour suivre et échanger tous les mèmes : graphiques, alertes, ordres. Pour ceux qui veulent aller plus loin.",
    statut: "À venir",
  },
  {
    nom: "Le Comptoir",
    role: "Le paiement",
    texte: "Payer et être payé en stablecoins, en quelques secondes et pour quelques centimes, de jour comme de nuit. La monnaie du quotidien, sans guichet.",
    statut: "À venir",
  },
  {
    nom: "L'application",
    role: "Tout dans la poche",
    texte: "Inscription par e-mail, montants en euros, notifications : l'écosystème complet sur mobile, pensé pour ceux qui n'ont jamais touché à la crypto.",
    statut: "À venir",
  },
];

const ETAPES: { phase: string; titre: string; points: string[] }[] = [
  { phase: "Phase I", titre: "Les États généraux", points: ["Bêta publique de La Frappe", "Liste d'attente du lancement", "Premiers clans et premiers créateurs"] },
  { phase: "Phase II", titre: "Le Serment", points: ["Lancement officiel en argent réel", "Cahiers de doléances (points)", "Revenus pour les créateurs"] },
  { phase: "Phase III", titre: "La Prise", points: ["Lancement de $TIERS, distribué d'abord à la communauté", "L'Assemblée et le Trésor du peuple", "La Bourse"] },
  { phase: "Phase IV", titre: "La République", points: ["Le Comptoir et les paiements", "L'application mobile", "Ouverture internationale"] },
];

const STATUT_STYLE: Record<Brique["statut"], string> = {
  "En ligne": "bg-achat/15 text-achat",
  "En construction": "bg-amber-400/15 text-amber-300",
  "À venir": "bg-white/5 text-muted-foreground",
};

export default function VisionPage() {
  return (
    <article className="mx-auto max-w-5xl space-y-20">
      <header className="flex flex-col items-center space-y-6 text-center">
        <LogoMark size={96} className="drop-shadow-[0_0_40px_rgba(140,147,201,0.55)]" />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-pervenche">Vision</p>
        <h1 className="text-lueur-gradient max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">L&apos;écosystème financier du peuple.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Frapper sa monnaie, l&apos;échanger, payer avec, et décider ensemble de la suite. Tiers-État commence par un launchpad. Il ne s&apos;arrête pas là.
        </p>
      </header>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Huit briques, un seul écosystème</h2>
          <p className="text-muted-foreground">Chaque brique renforce les autres. Le launchpad attire, les points récompensent, $TIERS relie tout.</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BRIQUES.map((b) => (
            <li key={b.nom} className="surface space-y-2 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-pervenche">{b.role}</p>
                  <h3 className="mt-1 text-xl font-semibold">{b.nom}</h3>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLE[b.statut]}`}>{b.statut}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.texte}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">La feuille de route</h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {ETAPES.map((e, i) => (
            <li key={e.phase} className={`surface space-y-3 p-5 ${i === 0 ? "ring-1 ring-pervenche/40" : ""}`}>
              <p className="font-mono text-xs uppercase tracking-widest text-pervenche">
                {e.phase}
                {i === 0 && " · maintenant"}
              </p>
              <h3 className="text-lg font-semibold">{e.titre}</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {e.points.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="surface space-y-4 p-8 text-center">
        <h2 className="text-2xl font-semibold">Les premiers bâtisseurs écrivent l&apos;histoire.</h2>
        <p className="mx-auto max-w-xl text-muted-foreground">
          La bêta est ouverte et gratuite. Rejoins la liste pour être prévenu du lancement officiel.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/rejoindre" className="btn-primary">
            Rejoindre le lancement
          </Link>
          <Link href="/demarrer" className="btn-ghost">
            Essayer la bêta
          </Link>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Cette page décrit une vision et une feuille de route indicative, susceptibles d&apos;évoluer. Rien ici n&apos;est une offre de vente, une
        promesse de distribution ou de rendement. $TIERS et les fonctions « à venir » n&apos;existent pas encore et restent soumis à validation
        juridique. Les crypto-actifs sont risqués : tu peux perdre la totalité de ta mise.
      </p>
    </article>
  );
}
