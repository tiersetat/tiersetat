import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Export CSV de la liste d'attente (administrateurs uniquement). */
export async function GET() {
  try {
    if (!(await requireAdmin())) return jsonError(403, "Réservé aux administrateurs.");
    const { data, error } = await supabaseAdmin()
      .from("waitlist")
      .select("email, source, created_at")
      .order("created_at", { ascending: true })
      .limit(100_000);
    if (error) throw error;
    const rows = (data ?? []).map((r) => [r.email, r.source ?? "", r.created_at].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = ["email,source,inscrit_le", ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tiersetat-liste-attente-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
