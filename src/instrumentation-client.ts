import * as Sentry from "@sentry/nextjs";

/** Surveillance des erreurs dans le navigateur (Sentry). Inactive sans `NEXT_PUBLIC_SENTRY_DSN`. */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.1, beforeSend: (e) => ({ ...e, user: undefined }), environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development" });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
