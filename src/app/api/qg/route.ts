import { NextResponse, type NextRequest } from "next/server";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { holdsToken, qgMembers } from "@/lib/qg-data";
import { supabasePublic } from "@/lib/supabase/public";
import { solanaAddress } from "@/lib/validators";

/** État du QG d'un mème : nombre de membres, et si la personne connectée peut y écrire (détenteur ou créateur). */
export async function GET(req: NextRequest) {
  try {
    const parsed = solanaAddress.safeParse(req.nextUrl.searchParams.get("mint"));
    if (!parsed.success) return jsonError(400, "Mème inconnu.");
    const mint = parsed.data;
    const { data: token } = await supabasePublic().from("tokens").select("creator_wallet").eq("mint", mint).maybeSingle();
    if (!token) return jsonError(404, "Mème inconnu.");
    const wallet = await getSessionWallet();
    const isCreator = wallet === token.creator_wallet;
    const [members, holder] = await Promise.all([qgMembers(mint).catch(() => 0), wallet && !isCreator ? holdsToken(wallet, mint).catch(() => false) : Promise.resolve(isCreator)]);
    return NextResponse.json({ members, canPost: Boolean(wallet) && (isCreator || holder), isCreator, signedIn: Boolean(wallet), creator: token.creator_wallet });
  } catch (err) {
    return handleApiError(err);
  }
}
