import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { newInviteCode } from "@/lib/invite";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Code d'invitation du compte connecté (créé à la première demande) et nombre d'invités. */
export async function POST() {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Connecte-toi pour obtenir ton lien d'invitation.");
    const db = supabaseAdmin();

    const { data: profile, error } = await db.from("profiles").select("invite_code").eq("wallet", wallet).maybeSingle<{ invite_code: string | null }>();
    if (error) throw error;
    let code = profile?.invite_code ?? null;

    // Création à la première demande ; on réessaie en cas (rare) de collision
    for (let attempt = 0; !code && attempt < 5; attempt++) {
      const candidate = newInviteCode();
      const { error: updateError } = await db.from("profiles").update({ invite_code: candidate }).eq("wallet", wallet).is("invite_code", null);
      if (!updateError) code = candidate;
      else if (updateError.code !== "23505") throw updateError;
    }
    if (!code) return jsonError(500, "Impossible de créer ton code, réessaie.");

    const { count } = await db.from("profiles").select("wallet", { count: "exact", head: true }).eq("referred_by", wallet);
    return NextResponse.json({ code, invited: count ?? 0 });
  } catch (err) {
    return handleApiError(err);
  }
}
