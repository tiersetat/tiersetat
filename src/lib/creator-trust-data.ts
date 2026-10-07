import "server-only";
import { creatorTrust, soldPct, type CreatorToken, type CreatorTrade, type Trust } from "@/lib/creator-trust";
import { memo } from "@/lib/memo";
import { supabasePublic } from "@/lib/supabase/public";

/** Note de confiance d'un créateur (cache 60 s). */
export function getCreatorTrust(wallet: string): Promise<Trust> {
  return memo(`trust:${wallet}`, 60_000, async () => {
    const db = supabasePublic();
    const { data: tokens } = await db
      .from("tokens")
      .select("mint, created_at, migrated")
      .eq("creator_wallet", wallet)
      .limit(200)
      .returns<Omit<CreatorToken, "trades">[]>();
    if (!tokens?.length) return creatorTrust([]);
    const { data: trades } = await db
      .from("trades")
      .select("mint, side, token_amount, block_time")
      .eq("trader_wallet", wallet)
      .in(
        "mint",
        tokens.map((t) => t.mint),
      )
      .limit(5000)
      .returns<(CreatorTrade & { mint: string })[]>();
    return creatorTrust(tokens.map((t) => ({ ...t, trades: (trades ?? []).filter((tr) => tr.mint === t.mint) })));
  });
}

/** Part revendue par le créateur pour chaque token d'une liste (mint → % ou null). */
export async function creatorSoldByMint(tokens: { mint: string; creator_wallet: string }[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  if (tokens.length === 0) return out;
  const { data } = await supabasePublic()
    .from("trades")
    .select("mint, trader_wallet, side, token_amount")
    .in(
      "mint",
      tokens.map((t) => t.mint),
    )
    .limit(10_000)
    .returns<{ mint: string; trader_wallet: string; side: "buy" | "sell"; token_amount: number }[]>();
  for (const t of tokens) {
    out.set(t.mint, soldPct((data ?? []).filter((tr) => tr.mint === t.mint && tr.trader_wallet === t.creator_wallet)));
  }
  return out;
}
