import * as Sentry from "@sentry/nextjs";

/**
 * Surveillance des erreurs (Sentry), côté serveur. Inactive tant que `SENTRY_DSN` n'est pas renseigné.
 * Aucune donnée personnelle envoyée (pas d'adresse IP, pas de cookies) ; 10 % des requêtes mesurées pour la latence.
 */
export function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, tracesSampleRate: 0.1, beforeSend: (e) => ({ ...e, user: undefined }), environment: process.env.VERCEL_ENV ?? "development" });
}

export const onRequestError = Sentry.captureRequestError;
