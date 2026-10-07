import "server-only";
import { Connection, PublicKey } from "@solana/web3.js";
import { SERVER_RPC_URL } from "@/lib/solana/server-rpc";
import { supabaseAdmin } from "@/lib/supabase/server";
import { indexTrade } from "@/lib/trades";

const lastSync = new Map<string, number>();
const MIN_INTERVAL_MS = 30_000;
/** Signatures récentes examinées par synchronisation (et transactions lues au plus). */
const SCAN = 30;
const MAX_FETCH = 10;

/**
 * Rattrape les trades faits hors du site (Jupiter, Phantom, bots…) : lit les dernières
 * transactions du pool sur la blockchain et indexe celles qui manquent.
 * Sans service externe ; au plus une fois toutes les 30 s par token.
 */
export async function syncPoolTrades(token: { mint: string; pool: string }): Promise<{ indexed: number; skipped: boolean }> {
  const now = Date.now();
  if (now - (lastSync.get(token.mint) ?? 0) < MIN_INTERVAL_MS) return { indexed: 0, skipped: true };
  lastSync.set(token.mint, now);

  const connection = new Connection(SERVER_RPC_URL, { commitment: "confirmed", disableRetryOnRateLimit: true });
  const sigs = (await connection.getSignaturesForAddress(new PublicKey(token.pool), { limit: SCAN })).filter((s) => !s.err);
  if (sigs.length === 0) return { indexed: 0, skipped: false };

  const { data: known, error } = await supabaseAdmin()
    .from("trades")
    .select("signature")
    .in("signature", sigs.map((s) => s.signature));
  if (error) throw error;
  const knownSet = new Set((known ?? []).map((k) => k.signature as string));
  const missing = sigs.filter((s) => !knownSet.has(s.signature)).slice(0, MAX_FETCH);

  let indexed = 0;
  // Du plus ancien au plus récent, pour un historique dans l'ordre
  for (const s of missing.reverse()) {
    try {
      const res = await indexTrade(connection, s.signature, token);
      if (res.ok && res.trade) indexed++;
    } catch {
      // RPC limité : on reprendra à la prochaine synchronisation
      break;
    }
  }
  return { indexed, skipped: false };
}
