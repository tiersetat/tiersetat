import { expect, it } from "vitest";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

it("lit les revenus de $TIERS et simule leur encaissement par la trésorerie", async () => {
  const { RPC_URL, FOUNDER_WALLET } = await import("@/lib/solana/config");
  const { loadRevenues, buildClaimTxs } = await import("@/lib/solana/claims");
  const connection = new Connection(RPC_URL, "confirmed");
  const treasury = FOUNDER_WALLET as PublicKey;
  const [rev] = await loadRevenues(connection, ["FyFeVD9k4wSosszWf6CfGVShmc7MTjKreG4UPHVbQbR1"], treasury);
  console.log("frais de trading à encaisser :", Number(rev.tradingLamports) / 1e9, "SOL ; création :", Number(rev.creationLamports) / 1e9);
  expect(rev.tradingLamports > BigInt(0)).toBe(true);
  expect(rev.creationLamports).toBe(BigInt(0)); // ancienne config : création gratuite
  const txs = await buildClaimTxs(connection, rev, treasury);
  expect(txs).toHaveLength(1);
  const tx = txs[0];
  tx.feePayer = treasury;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sim = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) console.log((sim.value.logs ?? []).slice(-10).join("\n"));
  expect(sim.value.err).toBeNull();
});
