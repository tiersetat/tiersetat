import { expect, it } from "vitest";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

it("simule la création d'une config avec 70 % créateur et 0,02 SOL de création", async () => {
  const { RPC_URL, FOUNDER_WALLET } = await import("@/lib/solana/config");
  const { buildCreateConfigTx } = await import("@/lib/solana/dbc");
  const { buildPlatformCurve } = await import("@/lib/solana/curve");
  const params = buildPlatformCurve();
  expect(params.creatorTradingFeePercentage).toBe(70);
  expect(params.poolCreationFee.toString()).toBe("20000000");
  const connection = new Connection(RPC_URL, "confirmed");
  const payer = FOUNDER_WALLET as PublicKey;
  const { tx } = await buildCreateConfigTx(connection, payer, payer);
  tx.feePayer = payer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sim = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
  if (sim.value.err) console.log((sim.value.logs ?? []).slice(-10).join("\n"));
  expect(sim.value.err).toBeNull();
});
