import { NextResponse, type NextRequest } from "next/server";
import { getSessionWallet } from "@/lib/auth/session";
import { getBlockedWords } from "@/lib/blocked-words";
import { handleApiError, jsonError } from "@/lib/api";
import { sniffImageType } from "@/lib/image";
import { gatewayUrl, pinFile } from "@/lib/ipfs";
import { moderate } from "@/lib/moderation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validators";
import { rateLimit, tooMany } from "@/lib/rate-limit";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Mise à jour de son propre profil : pseudo, bio, avatar (IPFS). */
export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Connecte-toi pour modifier ton profil.");
    if (!rateLimit(`profile:${wallet}`, 10, 10 * 60_000)) return tooMany(10);

    const form = await req.formData();
    const { pseudo, bio } = profileUpdateSchema.parse({
      pseudo: form.get("pseudo") ?? undefined,
      bio: form.get("bio") ?? undefined,
    });

    const verdict = moderate([pseudo ?? "", bio ?? ""], await getBlockedWords());
    if (!verdict.ok) return jsonError(422, verdict.reason);

    const update: Record<string, string | null> = {};
    if (pseudo !== undefined) update.pseudo = pseudo || null;
    if (bio !== undefined) update.bio = bio || null;

    if (form.get("removeAvatar") === "1") update.avatar_url = null;
    const avatar = form.get("avatar");
    if (avatar instanceof Blob && avatar.size > 0) {
      if (avatar.size > AVATAR_MAX_BYTES) return jsonError(413, "Avatar trop lourd (2 Mo max).");
      const bytes = new Uint8Array(await avatar.arrayBuffer());
      const type = sniffImageType(bytes);
      if (!type) return jsonError(415, "Format d'image non supporté (PNG, JPG, GIF ou WebP).");
      update.avatar_url = gatewayUrl(await pinFile(new Blob([bytes], { type }), `avatar-${wallet}.${type.split("/")[1]}`));
    }

    const db = supabaseAdmin();
    await db.from("profiles").upsert({ wallet }, { onConflict: "wallet", ignoreDuplicates: true });
    const { data, error } = await db
      .from("profiles")
      .update(update)
      .eq("wallet", wallet)
      .select("wallet, pseudo, avatar_url, bio, role")
      .single();
    if (error?.code === "23505") return jsonError(409, "Ce pseudo est déjà pris.");
    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (err) {
    return handleApiError(err);
  }
}
