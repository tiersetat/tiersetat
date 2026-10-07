import "server-only";
import { jsonError } from "@/lib/api";

const buckets = new Map<string, number[]>();

/**
 * Limitation de débit en mémoire (fenêtre glissante), par instance serveur.
 * Suffisant contre les abus simples sur le devnet ; pour le mainnet, passer à un
 * stockage partagé (ex. Upstash Redis) — voir LANCEMENT.md.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // Ménage occasionnel pour ne pas garder des clés inactives
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  return true;
}

export function tooMany(minutes: number) {
  return jsonError(429, `Trop de tentatives. Réessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}.`);
}

/** Adresse IP du client (en-têtes posés par Vercel). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "inconnue";
}
