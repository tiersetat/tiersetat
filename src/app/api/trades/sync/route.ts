import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";
import { syncPoolTrades } from "@/lib/sync";
import { solanaAddress } from "@/lib/validators";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

const schema = z.object({ mint: solanaAddress });

/** Synchronise les trades d'un token faits hors du site (appelé à l'ouverture de sa page). */
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`sync:${clientIp(req.headers)}`, 30, 10 * 60_000)) return tooMany(10);
    const { mint } = schema.parse(await req.json());
    const { data: token, error } = await supabaseAdmin().from("tokens").select("mint, pool").eq("mint", mint).maybeSingle<{ mint: string; pool: string }>();
    if (error) throw error;
    if (!token) return jsonError(404, "Token inconnu.");
    return NextResponse.json(await syncPoolTrades(token));
  } catch (err) {
    return handleApiError(err);
  }
}
