import fs from "node:fs";
import BN from "bn.js";
import { expect, it } from "vitest";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";

/**
 * Test de bout en bout RÉEL (écrit sur le devnet) : lancement d'un mème, remplissage complet
 * de la courbe, puis migration vers Meteora DAMM v2 (« prise de la Bastille »).
 * Ne tourne que sur demande explicite :
 *   RUN_BASTILLE=1 BASTILLE_WALLET=/chemin/wallet.json npm run test:devnet -- bastille
 * Le token de test n'est jamais enregistré dans Supabase : il n'apparaît pas sur le site.
 */
const run = process.env.RUN_BASTILLE === "1";
const sol = (lamports: BN | bigint | number) => Number(lamports.toString()) / LAMPORTS_PER_SOL;

it.skipIf(!run)("lance un mème, remplit la courbe et le fait migrer vers DAMM v2", { timeout: 15 * 60_000 }, async () => {
  const { DBC_CONFIG } = await import("@/lib/solana/config");
  const { buildLaunchTx } = await import("@/lib/solana/launch");
  const { buildSwapTx, loadPoolSnapshot } = await import("@/lib/solana/swap");
  const { buildMigrationTx } = await import("@/lib/solana/migration");
  const { loadRevenues } = await import("@/lib/solana/claims");
  const { TREASURY_WALLET } = await import("@/lib/solana/config");

  const rpc = process.env.SOLANA_RPC_URL as string;
  expect(rpc, "SOLANA_RPC_URL").toBeTruthy();
  expect(rpc).not.toMatch(/mainnet/i);
  const connection = new Connection(rpc, "confirmed");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.BASTILLE_WALLET as string, "utf8"))));
  const send = (tx: Parameters<typeof sendAndConfirmTransaction>[1], signers: Keypair[]) =>
    sendAndConfirmTransaction(connection, tx, [payer, ...signers], { commitment: "confirmed" });

  console.log("wallet de test", payer.publicKey.toBase58(), "solde", sol(await connection.getBalance(payer.publicKey)), "SOL");

  // 1. Lancement (ou reprise d'un mème de test existant : BASTILLE_MINT=<mint>)
  let mint: PublicKey;
  if (process.env.BASTILLE_MINT) {
    mint = new PublicKey(process.env.BASTILLE_MINT);
    console.log("1. reprise du mème", mint.toBase58());
  } else {
    const { tx: launchTx, mintKeypair } = await buildLaunchTx(connection, {
      creator: payer.publicKey,
      name: "Test Bastille",
      symbol: "BASTIL",
      uri: "https://tiersetat.vercel.app/test-bastille.json",
      firstBuySol: 0.5,
    });
    const launchSig = await send(launchTx, [mintKeypair]);
    mint = mintKeypair.publicKey;
    console.log("1. lancé", mint.toBase58(), "tx", launchSig);
  }
  const pool = deriveDbcPoolAddress(NATIVE_MINT, mint, DBC_CONFIG as PublicKey).toBase58();
  console.log("   pool", pool);

  // 2. Remplissage de la courbe par achats successifs
  for (let i = 0; i < 20; i++) {
    const snap = await loadPoolSnapshot(connection, pool);
    const reserve = new BN(snap.virtualPool.poolState.quoteReserve.toString());
    const threshold = new BN(snap.config.migrationQuoteThreshold.toString());
    console.log(`2. courbe ${sol(reserve).toFixed(3)} / ${sol(threshold).toFixed(3)} SOL`);
    if (reserve.gte(threshold)) break;
    // 1 % de frais prélevés sur l'entrée : on vise le reste + 3 % de marge, par paliers de 1,5 SOL max
    const remaining = threshold.sub(reserve).muln(103).divn(100).addn(1_000_000);
    const amountIn = BN.min(remaining, new BN(1.5 * LAMPORTS_PER_SOL));
    const swapTx = await buildSwapTx(connection, { owner: payer.publicKey, pool, side: "buy", amountIn, minimumAmountOut: new BN(0) });
    const sig = await send(swapTx, []);
    console.log(`   achat ${sol(amountIn).toFixed(3)} SOL`, sig);
  }

  const before = await loadPoolSnapshot(connection, pool);
  console.log("   état avant migration : isMigrated =", before.virtualPool.poolState.isMigrated, "· progression =", before.virtualPool.poolState.migrationProgress);

  // 3. Migration vers DAMM v2 (permissionless : le wallet de test paie)
  const { tx: migTx, signers } = await buildMigrationTx(connection, payer.publicKey, pool);
  const migSig = await send(migTx, signers);
  console.log("3. migration", migSig);

  // 4. Vérifications
  const after = await loadPoolSnapshot(connection, pool);
  console.log("4. après : isMigrated =", after.virtualPool.poolState.isMigrated, "· progression =", after.virtualPool.poolState.migrationProgress);
  expect(Number(after.virtualPool.poolState.isMigrated)).toBe(1);

  if (TREASURY_WALLET) {
    const [rev] = await loadRevenues(connection, [pool], TREASURY_WALLET);
    console.log("   frais plateforme encaissables :", sol(rev?.tradingLamports ?? BigInt(0)), "SOL (trading) +", sol(rev?.creationLamports ?? BigInt(0)), "SOL (création)");
  }
  console.log(`   explorer : https://solscan.io/token/${mint.toBase58()}?cluster=devnet`);
  console.log("   positions LP (NFT) :", signers.map((s) => s.publicKey.toBase58()).join(", "));
});
