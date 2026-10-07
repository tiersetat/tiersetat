import { NextResponse, type NextRequest } from "next/server";
import { Connection } from "@solana/web3.js";
import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { SERVER_RPC_URL } from "@/lib/solana/server-rpc";
import { indexTrade } from "@/lib/trades";
import { supabaseAdmin } from "@/lib/supabase/server";
import { solanaAddress } from "@/lib/validators";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

const schema = z.object({ signature: z.string().min(64).max(100), mint: solanaAddress });

/**
 * Indexe un achat / une vente APRÈS vérification on-chain.
 * Pas de session requise : le contenu est entièrement relu sur la blockchain.
 */
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`trade:${clientIp(req.headers)}`, 60, 10 * 60_000)) return tooMany(10);
    const { signature, mint } = schema.parse(await req.json());
    const { data: token, error } = await supabaseAdmin()
      .from("tokens")
      .select("mint, pool")
      .eq("mint", mint)
      .maybeSingle<{ mint: string; pool: string }>();
    if (error) throw error;
    if (!token) return jsonError(404, "Mème inconnu.");

    const result = await indexTrade(new Connection(SERVER_RPC_URL, "confirmed"), signature, token);
    if (!result.ok) return jsonError(result.status, result.error);
    return NextResponse.json({ trade: result.trade });
  } catch (err) {
    return handleApiError(err);
  }
}
