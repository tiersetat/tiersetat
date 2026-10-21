"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { LogoMark } from "@/components/brand/Logo";

/** Erreur inattendue sur une page : message clair, bouton pour réessayer, et signalement automatique à Sentry. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <LogoMark size={72} className="opacity-80" />
      <h1 className="text-3xl font-bold tracking-tight">Oups, un souci de notre côté</h1>
      <p className="max-w-md text-muted-foreground">L&apos;équipe a été prévenue automatiquement. Réessaie dans un instant.</p>
      <button type="button" onClick={reset} className="btn-primary">
        Réessayer
      </button>
    </div>
  );
}
