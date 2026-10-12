import "server-only";
import { memo } from "@/lib/memo";
import { supabasePublic } from "@/lib/supabase/public";

export type Community = {
  mint: string;
  name: string;
  ticker: string;
  image_url: string;
  creator_wallet: string;
  members: number;
  lastMessage: { body: string; at: string } | null;
  lastActivity: number;
};

/** Toutes les communautés (une par mème visible), de la plus active à la moins active. Cache 30 s. */
export function listCommunities(): Promise<Community[]> {
  return memo("communities", 30_000, async () => {
    const db = supabasePublic();
    const { data: tokens } = await db
      .from("tokens")
      .select("mint, name, ticker, image_url, creator_wallet, created_at")
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!tokens?.length) return [];
    const mints = tokens.map((t) => t.mint as string);
    const [{ data: trades }, { data: comments }] = await Promise.all([
      db.from("trades").select("mint, trader_wallet, side, token_amount").in("mint", mints).limit(20_000),
      db.from("comments").select("mint, body, created_at").in("mint", mints).eq("hidden", false).order("created_at", { ascending: false }).limit(1000),
    ]);
    const balances = new Map<string, Map<string, number>>();
    for (const t of trades ?? []) {
      const b = balances.get(t.mint) ?? new Map<string, number>();
      b.set(t.trader_wallet, (b.get(t.trader_wallet) ?? 0) + (t.side === "buy" ? 1 : -1) * Number(t.token_amount));
      balances.set(t.mint, b);
    }
    const last = new Map<string, { body: string; at: string }>();
    for (const c of comments ?? []) if (!last.has(c.mint)) last.set(c.mint, { body: c.body, at: c.created_at });
    return tokens
      .map((t) => {
        const lm = last.get(t.mint) ?? null;
        return {
          mint: t.mint,
          name: t.name,
          ticker: t.ticker,
          image_url: t.image_url,
          creator_wallet: t.creator_wallet,
          members: [...(balances.get(t.mint)?.values() ?? [])].filter((v) => v > 0).length,
          lastMessage: lm,
          lastActivity: Date.parse(lm?.at ?? t.created_at),
        };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity);
  });
}
