import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";
import { solanaAddress } from "@/lib/validators";
import { rateLimit, tooMany } from "@/lib/rate-limit";

/** Nombre de signalements distincts en attente au-delà duquel le token est masqué en attendant l'examen. */
const AUTO_HIDE_THRESHOLD = 5;

const schema = z.object({
  mint: solanaAddress,
  reason: z.enum(["usurpation", "haine", "arnaque", "illegal", "autre"]),
  details: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Connecte-toi pour signaler un token.");
    if (!rateLimit(`report:${wallet}`, 10, 60 * 60_000)) return tooMany(60);
    const { mint, reason, details } = schema.parse(await req.json());
    const db = supabaseAdmin();

    const { data: token, error: tErr } = await db.from("tokens").select("mint, hidden").eq("mint", mint).maybeSingle();
    if (tErr) throw tErr;
    if (!token) return jsonError(404, "Token inconnu.");

    // Le compte doit exister (clé étrangère) : il est normalement créé à la connexion
    await db.from("profiles").upsert({ wallet }, { onConflict: "wallet", ignoreDuplicates: true });
    const { error } = await db.from("reports").insert({ mint, reporter_wallet: wallet, reason, details: details || null });
    if (error?.code === "23505") return jsonError(409, "Tu as déjà signalé ce token.");
    if (error) throw error;

    // Masquage préventif si beaucoup de comptes différents signalent le même token
    const { count, error: cErr } = await db.from("reports").select("id", { count: "exact", head: true }).eq("mint", mint).eq("status", "open");
    if (cErr) throw cErr;
    if (!token.hidden && (count ?? 0) >= AUTO_HIDE_THRESHOLD) {
      await db
        .from("tokens")
        .update({ hidden: true, hidden_reason: `Masqué automatiquement : ${count} signalements en attente d'examen`, hidden_at: new Date().toISOString() })
        .eq("mint", mint);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
