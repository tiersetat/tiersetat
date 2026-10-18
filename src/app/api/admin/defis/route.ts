import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("valider"), id: z.number().int().positive() }),
  z.object({ action: z.literal("refuser"), id: z.number().int().positive(), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("masquer-participation"), entryId: z.number().int().positive() }),
]);

/** Modération des défis (admin) : valider, refuser avec une raison, masquer une participation. */
export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin())) return jsonError(403, "Réservé aux administrateurs.");
    const body = schema.parse(await req.json());
    const db = supabaseAdmin();
    // À la validation, la durée choisie repart de zéro (le temps de vérification n'est pas décompté)
    const pending = body.action === "valider" ? (await db.from("defis").select("created_at, ends_at").eq("id", body.id).maybeSingle()).data : null;
    const endsAt = pending ? new Date(Date.now() + Date.parse(pending.ends_at) - Date.parse(pending.created_at)).toISOString() : undefined;
    const { error } =
      body.action === "valider"
        ? await db.from("defis").update({ status: "approved", reject_reason: null, ends_at: endsAt }).eq("id", body.id).eq("status", "pending")
        : body.action === "refuser"
          ? await db.from("defis").update({ status: "rejected", reject_reason: body.reason }).eq("id", body.id)
          : await db.from("defi_entries").update({ hidden: true }).eq("id", body.entryId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
