import { expect, it } from "vitest";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

it("construit la migration DAMM v2 ; refusée tant que la courbe n'est pas remplie", async () => {
  const { RPC_URL, FOUNDER_WALLET } = await import("@/lib/solana/config");
  const { buildMigrationTx } = await import("@/lib/solana/migration");
  const connection = new Connection(RPC_URL, "confirmed");
  const payer = FOUNDER_WALLET as PublicKey;
  const { tx, signers } = await buildMigrationTx(connection, payer, "FyFeVD9k4wSosszWf6CfGVShmc7MTjKreG4UPHVbQbR1");
  expect(signers).toHaveLength(2);
  tx.feePayer = payer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sim = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
  const logs = (sim.value.logs ?? []).join("\n");
  // Le programme DBC atteint bien l'instruction de migration et la refuse car le pool
  // n'est pas encore en fin de courbe (contrôle d'état « NotPermitToDoThisAction »).
  expect(sim.value.err).not.toBeNull();
  expect(logs).toMatch(/Instruction: MigrationDammV2/);
  expect(logs).toMatch(/NotPermitToDoThisAction/);
});
