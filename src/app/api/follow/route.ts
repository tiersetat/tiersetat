import { NextResponse, type NextRequest } from "next/server";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";
import { followSchema } from "@/lib/validators";
import { rateLimit, tooMany } from "@/lib/rate-limit";

async function followerCount(wallet: string) {
  const { count } = await supabaseAdmin().from("follows").select("follower_wallet", { count: "exact", head: true }).eq("followee_wallet", wallet);
  return count ?? 0;
}

/** Suivre un compte. */
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionWallet();
    if (!me) return jsonError(401, "Connecte-toi pour suivre un compte.");
    if (!rateLimit(`follow:${me}`, 60, 60 * 60_000)) return tooMany(60);
    const { wallet } = followSchema.parse(await req.json());
    if (wallet === me) return jsonError(400, "Tu ne peux pas te suivre toi-même.");

    const db = supabaseAdmin();
    // Les deux comptes doivent exister (clés étrangères)
    await db.from("profiles").upsert([{ wallet: me }, { wallet }], { onConflict: "wallet", ignoreDuplicates: true });
    const { error } = await db
      .from("follows")
      .upsert({ follower_wallet: me, followee_wallet: wallet }, { onConflict: "follower_wallet,followee_wallet", ignoreDuplicates: true });
    if (error) throw error;
    return NextResponse.json({ following: true, followers: await followerCount(wallet) });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Ne plus suivre un compte. */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getSessionWallet();
    if (!me) return jsonError(401, "Connecte-toi d'abord.");
    if (!rateLimit(`follow:${me}`, 60, 60 * 60_000)) return tooMany(60);
    const { wallet } = followSchema.parse(await req.json());
    const { error } = await supabaseAdmin().from("follows").delete().eq("follower_wallet", me).eq("followee_wallet", wallet);
    if (error) throw error;
    return NextResponse.json({ following: false, followers: await followerCount(wallet) });
  } catch (err) {
    return handleApiError(err);
  }
}
