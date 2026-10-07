import "server-only";
import { computeFounders, FOUNDER_SEATS, type FirstAction } from "@/lib/founders";
import { memo } from "@/lib/memo";
import { supabasePublic } from "@/lib/supabase/public";

export type Founders = { byWallet: Map<string, number>; taken: number; seats: number };

/** Les Fondateurs (cache 60 s) : premières créations et premiers échanges visibles publiquement. */
export function getFounders(): Promise<Founders> {
  return memo("founders", 60_000, async () => {
    const db = supabasePublic();
    const [{ data: trades }, { data: tokens }] = await Promise.all([
      db.from("trades").select("trader_wallet, block_time").order("block_time", { ascending: true }).limit(20_000),
      db.from("tokens").select("creator_wallet, created_at").order("created_at", { ascending: true }).limit(5_000),
    ]);
    const actions: FirstAction[] = [
      ...(trades ?? []).map((t) => ({ wallet: t.trader_wallet as string, at: t.block_time as string })),
      ...(tokens ?? []).map((t) => ({ wallet: t.creator_wallet as string, at: t.created_at as string })),
    ];
    const byWallet = computeFounders(actions);
    return { byWallet, taken: byWallet.size, seats: FOUNDER_SEATS };
  });
}
