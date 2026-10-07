import "server-only";
import { Connection } from "@solana/web3.js";
import { memo } from "@/lib/memo";
import { FOUNDER_WALLET } from "@/lib/solana/config";
import { SERVER_RPC_URL } from "@/lib/solana/server-rpc";
import { parseSnapshotMemo } from "@/lib/snapshot";

export type SealedSnapshot = { signature: string; sealedAt: string | null; sha: string; root: string; cid: string; count: number };

/** Instantanés scellés, retrouvés directement sur la blockchain (mémos du wallet fondateur), cache 2 min. */
export function getSealedSnapshots(): Promise<SealedSnapshot[]> {
  return memo("snapshots", 120_000, async () => {
    if (!FOUNDER_WALLET) return [];
    const sigs = await new Connection(SERVER_RPC_URL, "confirmed").getSignaturesForAddress(FOUNDER_WALLET, { limit: 500 });
    return sigs.flatMap((s) => {
      const parsed = !s.err && s.memo ? parseSnapshotMemo(s.memo) : null;
      return parsed ? [{ signature: s.signature, sealedAt: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null, ...parsed }] : [];
    });
  });
}
