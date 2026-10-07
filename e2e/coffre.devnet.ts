import fs from "node:fs";
import { expect, it } from "vitest";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import * as multisig from "@sqds/multisig";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { phantomKeypair } from "./hd";

/**
 * Coffre multi-signature de la trésorerie (Squads v4) + nouvelle config DBC dont les frais vont au coffre.
 * Écrit sur le DEVNET, uniquement sur demande explicite :
 *   RUN_COFFRE=1 COFFRE_PAYER=/chemin/wallet.json COFFRE_OUT=/chemin/cles.txt npm run test:devnet -- coffre
 */
const run = process.env.RUN_COFFRE === "1";



it.skipIf(!run)("crée le coffre 2 sur 3 et la config dont les frais vont au coffre", { timeout: 5 * 60_000 }, async () => {
  const { buildCreateConfigTx } = await import("@/lib/solana/dbc");
  const rpc = process.env.SOLANA_RPC_URL as string;
  expect(rpc).not.toMatch(/mainnet/i);
  const connection = new Connection(rpc, "confirmed");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.COFFRE_PAYER as string, "utf8"))));
  const phantom = new PublicKey((process.env.NEXT_PUBLIC_FOUNDER_WALLET ?? process.env.NEXT_PUBLIC_TREASURY_WALLET) as string);

  // 1. Deux clés de secours, importables dans Phantom avec leur phrase de 12 mots
  const phrases = [generateMnemonic(wordlist, 128), generateMnemonic(wordlist, 128)];
  const backups = phrases.map(phantomKeypair);

  // 2. Coffre Squads v4 : 3 membres, 2 signatures requises, aucune autorité de configuration (personne ne peut changer les règles seul)
  const programConfigPda = multisig.getProgramConfigPda({})[0];
  const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(connection, programConfigPda);
  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });
  const all = multisig.types.Permissions.all();
  const createSig = await multisig.rpc.multisigCreateV2({
    connection,
    createKey,
    creator: payer,
    multisigPda,
    configAuthority: null,
    timeLock: 0,
    members: [phantom, ...backups.map((b) => b.publicKey)].map((key) => ({ key, permissions: all })),
    threshold: 2,
    rentCollector: null,
    treasury: programConfig.treasury,
    sendOptions: { skipPreflight: false },
  });
  await connection.confirmTransaction(createSig, "confirmed");
  const [vault] = multisig.getVaultPda({ multisigPda, index: 0 });

  const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
  expect(ms.threshold).toBe(2);
  expect(ms.members).toHaveLength(3);

  // 3. Nouvelle config DBC (mêmes règles) dont les frais et le reliquat vont au coffre
  const { tx, configKeypair } = await buildCreateConfigTx(connection, payer.publicKey, vault);
  const configSig = await sendAndConfirmTransaction(connection, tx, [payer, configKeypair], { commitment: "confirmed" });

  fs.writeFileSync(
    process.env.COFFRE_OUT as string,
    [
      "TIERS-ÉTAT · COFFRE DE LA TRÉSORERIE (RÉSEAU DE TEST / DEVNET)",
      "",
      "Coffre Squads 2 sur 3 : il faut 2 signatures parmi les 3 membres pour dépenser.",
      `Adresse du coffre (multisig) : ${multisigPda.toBase58()}`,
      `Adresse qui reçoit les frais (vault) : ${vault.toBase58()}`,
      `Nouvelle configuration Tiers-État : ${configKeypair.publicKey.toBase58()}`,
      "",
      `Membre 1 : ton Phantom actuel (${phantom.toBase58()})`,
      "",
      `Membre 2 · clé de secours A (${backups[0].publicKey.toBase58()})`,
      `Phrase secrète : ${phrases[0]}`,
      "",
      `Membre 3 · clé de secours B (${backups[1].publicKey.toBase58()})`,
      `Phrase secrète : ${phrases[1]}`,
      "",
      "À FAIRE :",
      "1. Recopie les deux phrases sur papier, à deux endroits différents.",
      "2. Supprime ce fichier ensuite (et vide la corbeille). Jamais de photo ni de cloud.",
      "3. Réseau de test uniquement : pour le vrai lancement, on recrée un coffre avec un Ledger ou une personne de confiance.",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  console.log("COFFRE", JSON.stringify({ multisig: multisigPda.toBase58(), vault: vault.toBase58(), config: configKeypair.publicKey.toBase58(), createSig, configSig }));
});
