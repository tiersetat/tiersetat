import "server-only";
import { FOUNDER_WALLET } from "@/lib/solana/config";
import { memo } from "@/lib/memo";
import { supabasePublic } from "@/lib/supabase/public";

export type DetteToken = { mint: string; name: string; image_url: string; market_cap_sol: number; curve_progress: number };

/** Le $DETTE officiel : premier token « DETTE » frappé par le wallet du fondateur (les copies sont ignorées). */
export function getOfficialDette(): Promise<DetteToken | null> {
  return memo("dette-token", 60_000, fetchOfficialDette);
}

async function fetchOfficialDette(): Promise<DetteToken | null> {
  if (!FOUNDER_WALLET) return null;
  const { data } = await supabasePublic()
    .from("tokens")
    .select("mint, name, image_url, market_cap_sol, curve_progress")
    .eq("ticker", "DETTE")
    .eq("creator_wallet", FOUNDER_WALLET.toBase58())
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<DetteToken>();
  return data;
}
