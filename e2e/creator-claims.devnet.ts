import { expect, it } from "vitest";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

it("lit les frais créateur de $TIERS et simule leur encaissement par le créateur", async () => {
  const { RPC_URL } = await import("@/lib/solana/config");
  const { loadCreatorEarnings, buildCreatorClaimTx } = await import("@/lib/solana/creator-claims");
  const connection = new Connection(RPC_URL, "confirmed");
  const pool = "FyFeVD9k4wSosszWf6CfGVShmc7MTjKreG4UPHVbQbR1";
  const creator = new PublicKey("3ujUWs8CBCAszwQpXuFq5ULcMCYs4VjGQm6vtGgkcfro");
  const lamports = (await loadCreatorEarnings(connection, [pool])).get(pool)!;
  expect(lamports > BigInt(0)).toBe(true);
  const tx = await buildCreatorClaimTx(connection, creator, pool, lamports);
  tx.feePayer = creator;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sim = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) console.log((sim.value.logs ?? []).slice(-10).join("\n"));
  expect(sim.value.err).toBeNull();
});
