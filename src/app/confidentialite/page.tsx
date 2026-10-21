import type { Metadata } from "next";
import Link from "next/link";
import { LegalNotice } from "@/components/layout/LegalNotice";

export const metadata: Metadata = { title: "Politique de confidentialité — Tiers-État" };

/** Champ à compléter une fois la société constituée. */
function Todo({ children }: { children: React.ReactNode }) {
  return <mark className="rounded bg-soleil/15 px-1 text-amber-200">{children}</mark>;
}

const DONNEES: [string, string, string][] = [
  ["Adresse de wallet", "Te connecter, afficher ton profil, tes tokens et tes échanges", "Tant que ton compte existe (les échanges restent publics sur la blockchain)"],
  ["Pseudo, avatar, bio, pays", "Ton profil public, que tu remplis toi-même", "Tant que ton compte existe"],
  ["E-mail ou compte Google", "Connexion, gérée par notre prestataire Privy. Tiers-État ne voit pas ton mot de passe", "Tant que ton compte existe"],
  ["Messages, thèses, signalements, défis", "Les fonctions sociales et la modération", "Tant que ton compte existe, ou jusqu'à suppression"],
  ["Pays de connexion (déduit de l'adresse IP)", "Bloquer l'accès depuis les pays sous sanctions", "Non conservé"],
  ["Abonnement aux notifications", "T'envoyer les alertes que tu as demandées", "Jusqu'à désabonnement"],
  ["Mesures techniques anonymes", "Détecter les erreurs et la lenteur des pages (Sentry, Vercel), sans adresse IP ni cookie publicitaire", "Au plus 90 jours"],
];

const PRESTATAIRES: [string, string][] = [
  ["Vercel", "Hébergement du site, mesure de la vitesse et de la fréquentation sans cookies"],
  ["Supabase", "Base de données"],
  ["Privy", "Connexion par e-mail ou Google, et wallet intégré"],
  ["Pinata", "Stockage des images des mèmes (IPFS, public par nature)"],
  ["Helius", "Accès à la blockchain Solana"],
  ["Sentry", "Détection des erreurs du site"],
];

export default function ConfidentialitePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-muted-foreground [&_h1]:text-foreground [&_h2]:text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">Politique de confidentialité</h1>
      <LegalNotice />
      <p>
        On collecte le moins possible. Pas de publicité, pas de revente de données, pas de cookie publicitaire. Voici exactement ce qu&apos;on utilise,
        et pourquoi.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qui est responsable</h2>
        <p>
          <Todo>Raison sociale, adresse</Todo>, éditeur de Tiers-État. Contact pour tes données : <Todo>adresse e-mail</Todo>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Les données utilisées</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2 pr-3">Donnée</th>
                <th className="py-2 pr-3">Pourquoi</th>
                <th className="py-2">Combien de temps</th>
              </tr>
            </thead>
            <tbody>
              {DONNEES.map(([d, why, how]) => (
                <tr key={d} className="border-t border-white/10 align-top">
                  <td className="py-2 pr-3 font-medium text-foreground">{d}</td>
                  <td className="py-2 pr-3">{why}</td>
                  <td className="py-2">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <b className="text-foreground">À savoir :</b> une blockchain est publique et permanente. Les échanges et les tokens créés restent visibles par
          tous, et personne, pas même Tiers-État, ne peut les effacer.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Cookies et stockage</h2>
        <p>
          Un seul cookie : celui de ta session, indispensable pour rester connecté. Ton navigateur garde aussi tes préférences (favoris, onglet choisi).
          Aucun cookie publicitaire ni de suivi : la mesure de fréquentation se fait sans cookies.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Nos prestataires</h2>
        <ul className="list-disc space-y-1 pl-5">
          {PRESTATAIRES.map(([n, r]) => (
            <li key={n}>
              <b className="text-foreground">{n}</b> : {r}
            </li>
          ))}
        </ul>
        <p>
          Certains sont situés hors de l&apos;Union européenne. Les transferts sont encadrés par les garanties prévues par le RGPD{" "}
          <Todo>(clauses contractuelles types, à confirmer)</Todo>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Tes droits</h2>
        <p>
          Tu peux à tout moment accéder à tes données, les corriger, les exporter, les supprimer ou t&apos;opposer à leur utilisation. Écris-nous à{" "}
          <Todo>adresse e-mail</Todo> : réponse sous un mois. Si tu n&apos;es pas satisfait, tu peux saisir la CNIL (cnil.fr).
        </p>
        <p>
          Voir aussi les{" "}
          <Link href="/cgu" className="underline underline-offset-2">
            conditions d&apos;utilisation
          </Link>{" "}
          et les{" "}
          <Link href="/mentions-legales" className="underline underline-offset-2">
            mentions légales
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
