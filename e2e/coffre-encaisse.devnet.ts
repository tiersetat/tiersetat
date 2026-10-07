import fs from "node:fs";
import { expect, it } from "vitest";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { phantomKeypair } from "./hd";

/**
 * Test RÉEL sur le devnet : un mème créé avec la config du coffre génère des frais,
 * puis deux membres du coffre proposent, approuvent et exécutent l'encaissement.
 *   RUN_COFFRE_CLAIM=1 COFFRE_PAYER=… COFFRE_KEYS=…/cles.txt npm run test:devnet -- coffre-encaisse
 */
const run = process.env.RUN_COFFRE_CLAIM === "1";

it.skipIf(!run)("encaisse les frais du coffre avec 2 signatures sur 3", { timeout: 10 * 60_000 }, async () => {
  const { DBC_CONFIG } = await import("@/lib/solana/config");
  const { buildLaunchTx } = await import("@/lib/solana/launch");
  const { buildApproveTx, buildClaimProposalTx, buildExecuteTx, loadVault, loadProposals } = await import("@/lib/solana/vault");
  const { dbcClient } = await import("@/lib/solana/dbc");

  const connection = new Connection(process.env.SOLANA_RPC_URL as string, "confirmed");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.COFFRE_PAYER as string, "utf8"))));
  const phrases = [...fs.readFileSync(process.env.COFFRE_KEYS as string, "utf8").matchAll(/^Phrase secrète : (.+)$/gm)].map((m) => m[1].trim());
  const [memberA, memberB] = phrases.map(phantomKeypair);
  const multisigPda = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_MULTISIG as string);
  const send = (tx: Transaction, signers: Keypair[]) => sendAndConfirmTransaction(connection, tx, signers, { commitment: "confirmed" });

  // 0. Un peu de SOL pour les frais réseau des deux membres et la location temporaire du compte SOL du coffre
  const before = await loadVault(connection, multisigPda);
  expect(before.members.map(String)).toEqual(expect.arrayContaining([memberA.publicKey.toBase58(), memberB.publicKey.toBase58()]));
  await send(
    new Transaction().add(
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: memberA.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: memberB.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: before.vault, lamports: 0.01 * LAMPORTS_PER_SOL }),
    ),
    [payer],
  );

  // 1. Un mème avec la config du coffre + un achat : des frais s'accumulent pour le coffre
  const { tx: launchTx, mintKeypair } = await buildLaunchTx(connection, { creator: payer.publicKey, name: "Test Coffre", symbol: "COFFRE", uri: "https://tiersetat.vercel.app/test-coffre.json", firstBuySol: 0.3 });
  await send(launchTx, [payer, mintKeypair]);
  const pool = deriveDbcPoolAddress(NATIVE_MINT, mintKeypair.publicKey, DBC_CONFIG as PublicKey).toBase58();
  const feeBefore = Number((await dbcClient(connection).state.getPool(pool))!.poolState.partnerQuoteFee.toString());
  console.log("frais plateforme accumulés (lamports):", feeBefore);
  expect(feeBefore).toBeGreaterThan(0);
  const vaultSolBefore = (await loadVault(connection, multisigPda)).balanceSol;

  // 2. Le membre A propose (et approuve), 3. le membre B approuve, 4. le membre B exécute
  const { tx: proposeTx, index } = await buildClaimProposalTx(connection, memberA.publicKey, multisigPda, [pool]);
  await send(proposeTx, [memberA]);
  await send(buildApproveTx(multisigPda, memberB.publicKey, index), [memberB]);
  const [p] = await loadProposals(connection, multisigPda, index, 1);
  console.log("proposition", index.toString(), p.status, "approbations:", p.approvals.length);
  expect(p.status).toBe("Approved");
  await send(await buildExecuteTx(connection, multisigPda, memberB.publicKey, index), [memberB]);

  // 5. Vérifications
  const feeAfter = Number((await dbcClient(connection).state.getPool(pool))!.poolState.partnerQuoteFee.toString());
  const vaultSolAfter = (await loadVault(connection, multisigPda)).balanceSol;
  console.log("frais restants:", feeAfter, "· coffre:", vaultSolBefore, "→", vaultSolAfter, "SOL");
  expect(feeAfter).toBe(0);
  expect(vaultSolAfter).toBeGreaterThan(vaultSolBefore);
  const [done] = await loadProposals(connection, multisigPda, index, 1);
  expect(done.status).toBe("Executed");
});
