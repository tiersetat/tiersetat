import { Keypair, type Connection, type PublicKey, type Transaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { buildPlatformCurve } from "./curve";

export function dbcClient(connection: Connection) {
  return DynamicBondingCurveClient.create(connection, "confirmed");
}

/**
 * Transaction de création de la config DBC de la plateforme.
 * La keypair de config est éphémère : elle signe une seule fois puis est jetée
 * (c'est juste l'adresse du nouveau compte, elle ne contrôle aucun fonds).
 */
export async function buildCreateConfigTx(
  connection: Connection,
  payer: PublicKey,
  treasury: PublicKey,
): Promise<{ tx: Transaction; configKeypair: Keypair }> {
  const configKeypair = Keypair.generate();
  const tx = await dbcClient(connection).partner.createConfig({
    payer,
    config: configKeypair.publicKey,
    feeClaimer: treasury,
    leftoverReceiver: treasury,
    quoteMint: NATIVE_MINT,
    ...buildPlatformCurve(),
  });
  return { tx, configKeypair };
}
