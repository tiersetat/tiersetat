import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: "Partenaires — Tiers-État",
  description: "Tiers-État, le launchpad des mèmes français : le projet, le produit, nos engagements de conformité et l'équipe.",
};

const ENGAGEMENTS: [string, string][] = [
  ["Non custodial", "Chaque utilisateur garde son propre wallet. Tiers-État ne détient jamais de fonds."],
  ["Levier plafonné", "×5 au maximum pour les particuliers (×2 sur les indices crypto), comme le prévoient les règles européennes."],
  ["Anti-arnaque intégré", "Créateurs qui revendent signalés à tous, promesses de gains refusées automatiquement, alertes avant chaque achat."],
  ["Lancement équitable", "Pas de prévente ni de part cachée : la même courbe pour tous, liquidité verrouillée après la migration."],
  ["Modération", "Signalements, mots bloqués, masquage, défis vérifiés avant publication. Pas de token qui vise une personne réelle."],
  ["Géo-blocage", "Les pays sous sanctions sont bloqués. La liste peut être étendue selon l'avis de notre avocat."],
];

const PRODUIT: [string, string][] = [
  ["L'actu devient un mème", "L'actualité française en direct, d'où chacun crée son mème en une minute."],
  ["Le mème devient un token", "Création et échange sur Solana, avec graphiques en direct."],
  ["Une communauté par mème", "Messages, GIF, défis et Mème de la semaine pour faire vivre chaque projet."],
  ["Un QG pour apprendre", "Des quêtes qui guident les débutants pas à pas, sans jargon."],
];

const CHERCHONS: [string, string][] = [
  ["Achat par carte", "Permettre d'acheter de la crypto par carte bancaire, directement dans le wallet de l'utilisateur."],
  ["Vérification d'identité", "Vérifier l'identité des clients et respecter les règles anti-blanchiment."],
  ["Accompagnement réglementaire", "Ouvrir l'argent réel en France et en Europe dans le cadre de MiCA."],
];

/**
 * Page publique pour les partenaires agréés, les investisseurs et la presse : visible sans compte,
 * affichée en plein écran par-dessus l'appli (pas de menus réservés aux membres).
 */
export default function PartenairesPage() {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-nuit">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_60%_at_50%_-10%,rgb(61_90_254/0.28),transparent_60%)]" />
      <div className="relative mx-auto max-w-5xl space-y-16 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-16">
        <nav className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2.5 font-extrabold">
            <LogoMark size={36} />
            Tiers-État
          </span>
          <a href="https://x.com/tiersetats" target="_blank" rel="noreferrer" className="btn-ghost min-h-10 px-4 text-sm">
            Nous écrire
          </a>
        </nav>

        <header className="space-y-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-pervenche">Espace partenaires</p>
          <h1 className="mx-auto max-w-3xl font-[family-name:var(--font-display)] text-4xl font-extrabold text-balance sm:text-6xl">Le launchpad des mèmes français.</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-balance">
            L&apos;actu française du jour devient un mème, et le mème devient un token que chacun peut créer, échanger et partager en une minute. Avec la conformité européenne comme point de départ.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#demo" className="btn-fete min-h-12 px-6">
              Voir la démo
            </a>
            <a href="https://x.com/tiersetats" target="_blank" rel="noreferrer" className="btn-ghost min-h-12 px-6">
              Prendre contact
            </a>
          </div>
        </header>

        <section id="demo" className="space-y-4">
          <video src="/images/partenaires/demo.mp4" poster="/images/partenaires/demo-poster.jpg" controls playsInline preload="metadata" className="aspect-video w-full rounded-3xl bg-black ring-1 ring-white/10" />
          <p className="text-center text-sm text-muted-foreground">
            Démonstration de l&apos;appli. Elle tourne aujourd&apos;hui en <b className="text-foreground">version test</b> : réseau de test Solana, argent fictif.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-center text-2xl font-extrabold sm:text-3xl">Le produit</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRODUIT.map(([t, d]) => (
              <div key={t} className="surface space-y-1 p-5">
                <h3 className="font-extrabold">{t}</h3>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- capture statique */}
          <img src="/images/partenaires/dashboard.jpg" alt="Tableau de bord de Tiers-État : cryptos, actualité, Mème de la semaine" loading="lazy" className="w-full rounded-3xl ring-1 ring-white/10" />
        </section>

        <section className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Nos engagements</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">Déjà intégrés dans l&apos;appli, avant même l&apos;ouverture de l&apos;argent réel.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ENGAGEMENTS.map(([t, d]) => (
              <div key={t} className="surface space-y-1 p-5">
                <h3 className="flex items-center gap-2 font-extrabold">
                  <span className="text-achat" aria-hidden>
                    ✓
                  </span>
                  {t}
                </h3>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface space-y-5 p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold">Ce que nous cherchons</h2>
            <p className="text-muted-foreground">Un partenaire agréé MiCA pour ouvrir l&apos;argent réel, dans les règles, en France puis en Europe.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {CHERCHONS.map(([t, d]) => (
              <div key={t} className="space-y-1 rounded-2xl bg-white/[0.04] p-4">
                <h3 className="font-extrabold">{t}</h3>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">L&apos;équipe</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Axel", "Fondateur · produit"],
                ["Raquel", "Cofondatrice · contenu et marque"],
                ["Rayanne", "CTO · technique et sécurité"],
              ] as [string, string][]
            ).map(([n, r]) => (
              <div key={n} className="surface p-5">
                <p className="text-lg font-extrabold">{n}</p>
                <p className="text-sm text-muted-foreground">{r}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Parlons-en</h2>
          <p className="mx-auto max-w-xl text-muted-foreground">Partenaire agréé, investisseur ou média : écrivez-nous, nous vous répondons rapidement.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://x.com/tiersetats" target="_blank" rel="noreferrer" className="btn-fete min-h-12 px-6">
              Écrire sur X
            </a>
            <Link href="/" className="btn-ghost min-h-12 px-6">
              Ouvrir l&apos;appli
            </Link>
          </div>
        </section>

        <footer className="space-y-2 border-t border-white/10 pt-6 text-center text-xs text-muted-foreground">
          <p>Tiers-État fonctionne aujourd&apos;hui en version test, sans argent réel. Les memecoins sont des actifs très risqués : on peut perdre la totalité de sa mise. Rien sur cette page n&apos;est une recommandation d&apos;investissement.</p>
          <p>
            <Link href="/mentions-legales" className="underline underline-offset-2">
              Mentions légales
            </Link>{" "}
            ·{" "}
            <Link href="/cgu" className="underline underline-offset-2">
              Conditions d&apos;utilisation
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
