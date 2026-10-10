import { NextResponse } from "next/server";
import { getFeed, type FeedFilter } from "@/lib/feed";
import { getSessionWallet } from "@/lib/auth/session";
import { supabasePublic } from "@/lib/supabase/public";

/** Fil social filtré : ?type=tout|echanges|theses&min=0|10|100|1000&abonnements=1 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const type = (["tout", "echanges", "theses"] as const).find((t) => t === q.get("type")) ?? "tout";
  const minUsd = [0, 10, 100, 1000].find((m) => String(m) === q.get("min")) ?? 0;
  let wallets: string[] | null = null;
  if (q.get("abonnements") === "1") {
    const me = await getSessionWallet();
    if (!me) return NextResponse.json({ items: [], needLogin: true });
    const { data } = await supabasePublic().from("follows").select("followee_wallet").eq("follower_wallet", me).limit(500);
    wallets = (data ?? []).map((f) => f.followee_wallet as string);
    if (wallets.length === 0) return NextResponse.json({ items: [], noFollows: true });
  }
  const filter: FeedFilter = { type, minUsd, wallets };
  try {
    return NextResponse.json({ items: await getFeed(filter) });
  } catch {
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}
