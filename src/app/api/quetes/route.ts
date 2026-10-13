import { NextResponse, type NextRequest } from "next/server";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api";
import { questData } from "@/lib/quetes-data";
import { solanaAddress } from "@/lib/validators";

/** Chapitre 2 du QG : l'état réel des quêtes du créateur connecté pour un de ses mèmes. */
export async function GET(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return NextResponse.json({ signedIn: false });
    const m = solanaAddress.safeParse(req.nextUrl.searchParams.get("mint"));
    const data = await questData(wallet, m.success ? m.data : null);
    return NextResponse.json({ signedIn: true, ...data });
  } catch (err) {
    return handleApiError(err);
  }
}
