import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Abonner cet appareil aux alertes du compte connecté. */
export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Connecte-toi pour activer les alertes.");
    if (!rateLimit(`push:${wallet}`, 10, 10 * 60_000)) return tooMany(10);
    const sub = subSchema.parse(await req.json());
    const db = supabaseAdmin();
    await db.from("profiles").upsert({ wallet }, { onConflict: "wallet", ignoreDuplicates: true });
    const { error } = await db.from("push_subscriptions").upsert({ endpoint: sub.endpoint, wallet, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: "endpoint" });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Désabonner cet appareil. */
export async function DELETE(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Connecte-toi d'abord.");
    const { endpoint } = z.object({ endpoint: z.string().url() }).parse(await req.json());
    await supabaseAdmin().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("wallet", wallet);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
