import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { clearBlockedWordsCache } from "@/lib/blocked-words";
import { normalizeText } from "@/lib/moderation";
import { supabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({ word: z.string().trim().min(2).max(60) });

async function guard() {
  return (await requireAdmin()) ? null : jsonError(403, "Réservé aux administrateurs.");
}

/** Ajout d'un mot bloqué (stocké normalisé : minuscules, sans accents). */
export async function POST(req: NextRequest) {
  try {
    const denied = await guard();
    if (denied) return denied;
    const word = normalizeText(schema.parse(await req.json()).word);
    if (word.length < 2) return jsonError(400, "Mot trop court.");
    const { error } = await supabaseAdmin().from("blocked_words").upsert({ word }, { onConflict: "word", ignoreDuplicates: true });
    if (error) throw error;
    clearBlockedWordsCache();
    return NextResponse.json({ word });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const denied = await guard();
    if (denied) return denied;
    const { word } = schema.parse(await req.json());
    const { error } = await supabaseAdmin().from("blocked_words").delete().eq("word", word);
    if (error) throw error;
    clearBlockedWordsCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
