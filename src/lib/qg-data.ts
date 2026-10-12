import "server-only";
import { Connection, PublicKey } from "@solana/web3.js";
import { memo } from "@/lib/memo";
import { SERVER_RPC_URL } from "@/lib/solana/server-rpc";
import { supabasePublic } from "@/lib/supabase/public";

/** Le compte détient-il au moins une fraction de ce mème ? (lecture directe sur la blockchain, cache 30 s) */
export function holdsToken(wallet: string, mint: string): Promise<boolean> {
  return memo(`qg:holds:${wallet}:${mint}`, 30_000, async () => {
    const connection = new Connection(SERVER_RPC_URL, { commitment: "confirmed", disableRetryOnRateLimit: true });
    const res = await connection.getParsedTokenAccountsByOwner(new PublicKey(wallet), { mint: new PublicKey(mint) });
    return res.value.some((a) => Number(a.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0) > 0);
  });
}

/** Membres du QG : les comptes qui détiennent encore le mème d'après les échanges enregistrés (cache 60 s). */
export function qgMembers(mint: string): Promise<number> {
  return memo(`qg:members:${mint}`, 60_000, async () => {
    const { data } = await supabasePublic().from("trades").select("trader_wallet, side, token_amount").eq("mint", mint).limit(20_000);
    const bal = new Map<string, number>();
    for (const t of data ?? []) bal.set(t.trader_wallet, (bal.get(t.trader_wallet) ?? 0) + (t.side === "buy" ? 1 : -1) * Number(t.token_amount));
    return [...bal.values()].filter((v) => v > 0).length;
  });
}
