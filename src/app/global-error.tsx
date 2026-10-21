"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/** Erreur grave (même la mise en page n'a pas pu s'afficher) : page minimale et signalement à Sentry. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a1a40", color: "#f4f1fa", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 28 }}>Tiers-État revient dans un instant</h1>
          <p style={{ opacity: 0.75 }}>L&apos;équipe a été prévenue automatiquement.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 999, border: 0, fontWeight: 700, cursor: "pointer" }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
