import type { Metadata } from "next";
import { LegalNotice } from "@/components/layout/LegalNotice";

export const metadata: Metadata = { title: "Mentions légales — Tiers-État" };

export default function MentionsLegalesPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-muted-foreground [&_h1]:text-foreground [&_h2]:text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">Mentions légales</h1>
      <LegalNotice />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Éditeur du site</h2>
        <p>
          [PLACEHOLDER] Raison sociale, forme juridique, capital, adresse du
          siège, SIREN/RCS, numéro de TVA, directeur de la publication, e-mail
          de contact.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Hébergeur</h2>
        <p>
          [PLACEHOLDER] Vercel Inc., 440 N Barranca Ave #4133, Covina, CA
          91723, États-Unis (à confirmer).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Statut réglementaire</h2>
        <p>
          [PLACEHOLDER] Statut au regard du règlement MiCA et de la
          réglementation AMF (PSAN / CASP) à déterminer avec un avocat avant
          tout lancement hors devnet.
        </p>
      </section>


      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Données personnelles</h2>
        <p>[PLACEHOLDER] Responsable de traitement, finalités, droits RGPD, contact DPO.</p>
      </section>
    </article>
  );
}
