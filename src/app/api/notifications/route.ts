import { NextResponse } from "next/server";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";

export type Notification = {
  id: string;
  kind: "follow" | "trade" | "comment" | "launch";
  actor: string;
  actorPseudo: string | null;
  mint?: string;
  tokenName?: string;
  ticker?: string;
  side?: "buy" | "sell";
  solAmount?: number;
  at: string;
};

const LIMIT = 30;
const WINDOW_DAYS = 14;

/** Notifications du compte connecté (14 derniers jours), du plus récent au plus ancien. */
export async function GET() {
  try {
    const me = await getSessionWallet();
    if (!me) return jsonError(401, "Connecte-toi pour voir tes notifications.");
    const db = supabaseAdmin();
    const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();

    const [{ data: myTokens }, { data: following }, { data: followers }] = await Promise.all([
      db.from("tokens").select("mint, name, ticker").eq("creator_wallet", me).eq("hidden", false).limit(200),
      db.from("follows").select("followee_wallet").eq("follower_wallet", me).limit(500),
      db.from("follows").select("follower_wallet, created_at").eq("followee_wallet", me).gte("created_at", since).order("created_at", { ascending: false }).limit(LIMIT),
    ]);
    const mine = new Map((myTokens ?? []).map((t) => [t.mint as string, t]));
    const mints = [...mine.keys()];
    const followed = (following ?? []).map((f) => f.followee_wallet as string);

    const [{ data: trades }, { data: comments }, { data: launches }] = await Promise.all([
      mints.length
        ? db.from("trades").select("signature, mint, trader_wallet, side, sol_amount, block_time").in("mint", mints).neq("trader_wallet", me).gte("block_time", since).order("block_time", { ascending: false }).limit(LIMIT)
        : Promise.resolve({ data: [] }),
      mints.length
        ? db.from("comments").select("id, mint, author_wallet, created_at").in("mint", mints).neq("author_wallet", me).eq("hidden", false).gte("created_at", since).order("created_at", { ascending: false }).limit(LIMIT)
        : Promise.resolve({ data: [] }),
      followed.length
        ? db.from("tokens").select("mint, name, ticker, creator_wallet, created_at").in("creator_wallet", followed).eq("hidden", false).gte("created_at", since).order("created_at", { ascending: false }).limit(LIMIT)
        : Promise.resolve({ data: [] }),
    ]);

    const items: Notification[] = [
      ...(followers ?? []).map((f) => ({ id: `f-${f.follower_wallet}`, kind: "follow" as const, actor: f.follower_wallet, actorPseudo: null, at: f.created_at })),
      ...(trades ?? []).map((t) => ({
        id: `t-${t.signature}`,
        kind: "trade" as const,
        actor: t.trader_wallet,
        actorPseudo: null,
        mint: t.mint,
        tokenName: mine.get(t.mint)?.name,
        ticker: mine.get(t.mint)?.ticker,
        side: t.side,
        solAmount: Number(t.sol_amount),
        at: t.block_time,
      })),
      ...(comments ?? []).map((c) => ({ id: `c-${c.id}`, kind: "comment" as const, actor: c.author_wallet, actorPseudo: null, mint: c.mint, tokenName: mine.get(c.mint)?.name, ticker: mine.get(c.mint)?.ticker, at: c.created_at })),
      ...(launches ?? []).map((l) => ({ id: `l-${l.mint}`, kind: "launch" as const, actor: l.creator_wallet, actorPseudo: null, mint: l.mint, tokenName: l.name, ticker: l.ticker, at: l.created_at })),
    ]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, LIMIT);

    // Pseudos des auteurs en une requête
    const actors = [...new Set(items.map((i) => i.actor))];
    if (actors.length) {
      const { data: profiles } = await db.from("profiles").select("wallet, pseudo").in("wallet", actors);
      const pseudo = new Map((profiles ?? []).map((p) => [p.wallet as string, p.pseudo as string | null]));
      for (const i of items) i.actorPseudo = pseudo.get(i.actor) ?? null;
    }
    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}
