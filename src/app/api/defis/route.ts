import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth/session";
import { getBlockedWords } from "@/lib/blocked-words";
import { handleApiError, jsonError } from "@/lib/api";
import { checkDefi, checkEntryUrl, DEFI_DURATIONS, DEFI_MAX_OPEN } from "@/lib/defis";
import { moderate } from "@/lib/moderation";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { solanaAddress } from "@/lib/validators";

type Defi = { id: number; mint: string; creator_wallet: string; title: string; rules: string; ends_at: string; status: string; reject_reason: string | null; winner_entry_id: number | null; created_at: string };

/** Les défis d'un mème : validés pour tous, plus ceux en attente (ou refusés) pour leur créateur. */
export async function GET(req: NextRequest) {
  try {
    const m = solanaAddress.safeParse(req.nextUrl.searchParams.get("mint"));
    if (!m.success) return jsonError(400, "Mème inconnu.");
    const me = await getSessionProfile();
    const db = supabaseAdmin();
    const { data: defis } = await db.from("defis").select("*").eq("mint", m.data).order("created_at", { ascending: false }).limit(30).returns<Defi[]>();
    const visible = (defis ?? []).filter((d) => d.status === "approved" || d.status === "closed" || d.creator_wallet === me?.wallet);
    const ids = visible.filter((d) => d.status !== "pending" && d.status !== "rejected").map((d) => d.id);
    const { data: entries } = ids.length
      ? await db.from("defi_entries").select("id, defi_id, author_wallet, url, note, created_at, profiles(pseudo, avatar_url)").in("defi_id", ids).eq("hidden", false).order("created_at", { ascending: true })
      : { data: [] };
    return NextResponse.json({ defis: visible, entries: entries ?? [], me: me?.wallet ?? null });
  } catch (err) {
    return handleApiError(err);
  }
}

const create = z.object({ action: z.literal("creer"), mint: solanaAddress, title: z.string().trim().max(80), rules: z.string().trim().max(500), days: z.number().int() });
const enter = z.object({ action: z.literal("participer"), defiId: z.number().int().positive(), url: z.string().trim().max(300), note: z.string().trim().max(200).optional() });
const pick = z.object({ action: z.literal("gagnant"), defiId: z.number().int().positive(), entryId: z.number().int().positive() });
const schema = z.discriminatedUnion("action", [create, enter, pick]);

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionProfile();
    if (!me) return jsonError(401, "Connecte-toi d'abord.");
    if (!rateLimit(`defis:${me.wallet}`, 20, 60 * 60_000)) return tooMany(60);
    const body = schema.parse(await req.json());
    const db = supabaseAdmin();
    const blocked = await getBlockedWords();

    if (body.action === "creer") {
      if (!(DEFI_DURATIONS as readonly number[]).includes(body.days)) return jsonError(422, "Durée invalide.");
      const { data: token } = await db.from("tokens").select("creator_wallet, hidden").eq("mint", body.mint).maybeSingle();
      if (!token || token.hidden) return jsonError(404, "Mème introuvable.");
      if (token.creator_wallet !== me.wallet) return jsonError(403, "Seul le créateur du mème peut lancer un défi.");
      const c = checkDefi(body.title, body.rules);
      if (!c.ok) return jsonError(422, c.reason);
      const mod = moderate([body.title, body.rules], blocked);
      if (!mod.ok) return jsonError(422, mod.reason);
      const { count } = await db.from("defis").select("id", { count: "exact", head: true }).eq("mint", body.mint).in("status", ["pending", "approved"]).gt("ends_at", new Date().toISOString());
      if ((count ?? 0) >= DEFI_MAX_OPEN) return jsonError(422, `${DEFI_MAX_OPEN} défis en cours au maximum par mème.`);
      const { error } = await db.from("defis").insert({ mint: body.mint, creator_wallet: me.wallet, title: body.title, rules: body.rules, ends_at: new Date(Date.now() + body.days * 86_400_000).toISOString() });
      if (error) throw error;
      return NextResponse.json({ ok: true, pending: true });
    }

    if (body.action === "participer") {
      const u = checkEntryUrl(body.url);
      if (!u.ok) return jsonError(422, u.reason);
      if (body.note) {
        const mod = moderate([body.note], blocked);
        if (!mod.ok) return jsonError(422, mod.reason);
      }
      const { data: d } = await db.from("defis").select("status, ends_at, creator_wallet").eq("id", body.defiId).maybeSingle();
      if (!d || d.status !== "approved") return jsonError(404, "Ce défi n'est pas ouvert.");
      if (Date.parse(d.ends_at) < Date.now()) return jsonError(422, "Ce défi est terminé.");
      if (d.creator_wallet === me.wallet) return jsonError(422, "Tu ne peux pas participer à ton propre défi.");
      await db.from("profiles").upsert({ wallet: me.wallet }, { onConflict: "wallet", ignoreDuplicates: true });
      const { error } = await db.from("defi_entries").insert({ defi_id: body.defiId, author_wallet: me.wallet, url: body.url.trim(), note: body.note || null });
      if (error?.code === "23505") return jsonError(409, "Tu participes déjà à ce défi.");
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    // Le créateur désigne la participation gagnante, ce qui clôt le défi
    const { data: d } = await db.from("defis").select("creator_wallet, status").eq("id", body.defiId).maybeSingle();
    if (!d || d.creator_wallet !== me.wallet) return jsonError(403, "Seul le créateur du défi choisit le gagnant.");
    if (d.status !== "approved") return jsonError(422, "Ce défi n'est pas ouvert.");
    const { data: e } = await db.from("defi_entries").select("id").eq("id", body.entryId).eq("defi_id", body.defiId).eq("hidden", false).maybeSingle();
    if (!e) return jsonError(404, "Participation introuvable.");
    const { error } = await db.from("defis").update({ winner_entry_id: body.entryId, status: "closed" }).eq("id", body.defiId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
