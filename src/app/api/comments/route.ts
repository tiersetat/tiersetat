import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { getBlockedWords } from "@/lib/blocked-words";
import { handleApiError, jsonError } from "@/lib/api";
import { moderate } from "@/lib/moderation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { solanaAddress } from "@/lib/validators";
import { rateLimit, tooMany } from "@/lib/rate-limit";

const postSchema = z.object({ mint: solanaAddress, body: z.string().trim().min(1, "Message vide").max(500, "500 caractères max") });
const hideSchema = z.object({ id: z.number().int().positive() });

/** Délai minimal entre deux messages d'un même compte (anti-spam). */
const COOLDOWN_MS = 10_000;

/** Publier un commentaire sous un token (session requise, modéré comme les tokens). */
export async function POST(req: NextRequest) {
  try {
    const profile = await getSessionProfile();
    if (!profile) return jsonError(401, "Connecte-toi pour commenter.");
    if (!rateLimit(`comment:${profile.wallet}`, 30, 60 * 60_000)) return tooMany(60);
    const { mint, body } = postSchema.parse(await req.json());

    const verdict = moderate([body], await getBlockedWords());
    if (!verdict.ok) return jsonError(422, verdict.reason);

    const db = supabaseAdmin();
    const { data: token } = await db.from("tokens").select("hidden").eq("mint", mint).maybeSingle();
    if (!token || token.hidden) return jsonError(404, "Token introuvable.");

    const { data: last } = await db
      .from("comments")
      .select("created_at")
      .eq("author_wallet", profile.wallet)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - Date.parse(last.created_at) < COOLDOWN_MS) {
      return jsonError(429, "Doucement ! Attends quelques secondes entre deux messages.");
    }

    const { data, error } = await db
      .from("comments")
      .insert({ mint, author_wallet: profile.wallet, body })
      .select("id, body, created_at, author_wallet")
      .single();
    if (error) throw error;
    return NextResponse.json({ comment: data });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Masquer un commentaire : son auteur ou un admin. */
export async function DELETE(req: NextRequest) {
  try {
    const profile = await getSessionProfile();
    if (!profile) return jsonError(401, "Connecte-toi d'abord.");
    const { id } = hideSchema.parse(await req.json());
    const db = supabaseAdmin();
    const { data: comment } = await db.from("comments").select("author_wallet").eq("id", id).maybeSingle();
    if (!comment) return jsonError(404, "Commentaire introuvable.");
    if (comment.author_wallet !== profile.wallet && profile.role !== "admin") return jsonError(403, "Action non autorisée.");
    const { error } = await db.from("comments").update({ hidden: true }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
