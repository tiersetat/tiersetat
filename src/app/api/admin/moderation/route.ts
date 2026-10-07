import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";
import { solanaAddress } from "@/lib/validators";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("hide"), mint: solanaAddress, reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("unhide"), mint: solanaAddress }),
  z.object({ action: z.literal("reject"), mint: solanaAddress }),
]);

/** Actions de modération (admin uniquement, rôle relu en base à chaque requête). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return jsonError(403, "Réservé aux administrateurs.");
    const body = schema.parse(await req.json());
    const db = supabaseAdmin();
    const now = new Date().toISOString();

    if (body.action === "hide") {
      const { error } = await db.from("tokens").update({ hidden: true, hidden_reason: body.reason, hidden_by: admin.wallet, hidden_at: now }).eq("mint", body.mint);
      if (error) throw error;
      await db.from("reports").update({ status: "resolved", resolved_at: now, resolved_by: admin.wallet }).eq("mint", body.mint).eq("status", "open");
    } else if (body.action === "unhide") {
      const { error } = await db.from("tokens").update({ hidden: false, hidden_reason: null, hidden_by: null, hidden_at: null }).eq("mint", body.mint);
      if (error) throw error;
    } else {
      // Signalements jugés infondés : on les clôt (et on réaffiche si le masquage était automatique)
      await db.from("reports").update({ status: "rejected", resolved_at: now, resolved_by: admin.wallet }).eq("mint", body.mint).eq("status", "open");
      await db
        .from("tokens")
        .update({ hidden: false, hidden_reason: null, hidden_at: null })
        .eq("mint", body.mint)
        .like("hidden_reason", "Masqué automatiquement%");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
