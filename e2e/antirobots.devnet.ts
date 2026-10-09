import fs from "node:fs";
import BN from "bn.js";
import { expect, it } from "vitest";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";

/**
 * Crée la config anti-robots (frais vers le coffre) puis vérifie sur un vrai mème que les frais
 * démarrent très haut et redescendent à 1 % au bout d'une minute.
 *   RUN_ANTIBOT=1 COFFRE_PAYER=… ANTIBOT_OUT=…/config.txt npm run test:devnet -- antirobots
 */
it.skipIf(process.env.RUN_ANTIBOT !== "1")("frais anti-robots : très hauts au lancement, 1 % après une minute", { timeout: 6 * 60_000 }, async () => {
  const connection = new Connection(process.env.SOLANA_RPC_URL as string, "confirmed");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.COFFRE_PAYER as string, "utf8"))));
  const vault = new PublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET as string);
  const send = (tx: Parameters<typeof sendAndConfirmTransaction>[1], signers: Keypair[]) => sendAndConfirmTransaction(connection, tx, signers, { commitment: "confirmed" });

  // 1. Nouvelle configuration (mêmes règles + anti-robots), frais au coffre
  const { buildCreateConfigTx } = await import("@/lib/solana/dbc");
  const { tx: cfgTx, configKeypair } = await buildCreateConfigTx(connection, payer.publicKey, vault);
  await send(cfgTx, [payer, configKeypair]);
  const config = configKeypair.publicKey;
  fs.writeFileSync(process.env.ANTIBOT_OUT as string, config.toBase58());
  console.log("CONFIG", config.toBase58());

  // 2. Lancement d'un mème avec cette config (le module lit la config à l'import)
  process.env.NEXT_PUBLIC_DBC_CONFIG = config.toBase58();
  const { buildLaunchTx } = await import("@/lib/solana/launch");
  const { loadPoolSnapshot, quote } = await import("@/lib/solana/swap");
  const { tx: launchTx, mintKeypair } = await buildLaunchTx(connection, { creator: payer.publicKey, name: "Test Robots", symbol: "ROBOT", uri: "https://tiersetat.vercel.app/test-robots.json", firstBuySol: 0.01 });
  await send(launchTx, [payer, mintKeypair]);
  const pool = deriveDbcPoolAddress(NATIVE_MINT, mintKeypair.publicKey, config).toBase58();

  // 3. Juste après le lancement : frais très élevés
  const early = quote(connection, await loadPoolSnapshot(connection, pool), "buy", new BN(10_000_000), 300).feePct;
  console.log("frais juste après le lancement :", early.toFixed(2), "%");
  expect(early).toBeGreaterThan(20);

  // 4. Une minute plus tard : retour aux frais normaux
  await new Promise((r) => setTimeout(r, 65_000));
  const late = quote(connection, await loadPoolSnapshot(connection, pool), "buy", new BN(10_000_000), 300).feePct;
  console.log("frais une minute après :", late.toFixed(2), "%");
  expect(late).toBeLessThan(1.2);
});
