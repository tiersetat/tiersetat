import "server-only";
import { memo } from "@/lib/memo";

/** Détenteurs et profil du créateur d'un token Solana (Jupiter). */
export type JupInfo = { holders: number | null; devMints: number | null; top10Pct: number | null };

/** Null si indisponible (quota, token inconnu) ; un échec n'est pas mis en cache. */
export function jupInfo(mint: string): Promise<JupInfo | null> {
  return memo(`jup-info:${mint}`, 5 * 60_000, async () => {
    const res = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mint}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`jupiter ${res.status}`);
    const [t] = (await res.json()) as { id: string; holderCount?: number; audit?: { devMints?: number; topHoldersPercentage?: number } }[];
    if (!t || t.id !== mint) return null;
    return { holders: t.holderCount ?? null, devMints: t.audit?.devMints ?? null, top10Pct: t.audit?.topHoldersPercentage ?? null };
  }).catch(() => null);
}
