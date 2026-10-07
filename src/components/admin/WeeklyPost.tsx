"use client";

import { useState } from "react";

/** Post X prêt à copier pour annoncer le gagnant de la semaine. */
export function WeeklyPost({ text }: { text: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="surface space-y-3 p-5">
      <h2 className="font-semibold">Annonce du Mème de la semaine</h2>
      {text ? (
        <>
          <p className="whitespace-pre-line rounded-xl bg-white/[0.03] p-3 text-sm">{text}</p>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* presse-papiers indisponible */
              }
            }}
          >
            {copied ? "Copié ✓" : "Copier le post X"}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Pas encore de gagnant la semaine dernière.</p>
      )}
    </section>
  );
}
