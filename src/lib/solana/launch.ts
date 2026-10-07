import BN from "bn.js";
import { Keypair, LAMPORTS_PER_SOL, type Connection, type PublicKey, type Transaction } from "@solana/web3.js";
import { DBC_CONFIG } from "./config";
import { dbcClient } from "./dbc";

/** Les mints Tiers-État finissent par « FR » quand c'est possible (signature de la plateforme). */
export function grindMintKeypair(suffix = "FR", maxAttempts = 30_000): Keypair {
  let kp = Keypair.generate();
  for (let i = 0; i < maxAttempts && !kp.publicKey.toBase58().endsWith(suffix); i++) {
    kp = Keypair.generate();
  }
  return kp;
}

export type LaunchParams = {
  creator: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  /** Achat initial du créateur, en SOL (0 = aucun) */
  firstBuySol: number;
};

/**
 * Une seule transaction : création du token + du pool DBC (+ premier achat optionnel).
 * La keypair du mint est éphémère : elle signe la création puis est jetée.
 */
export async function buildLaunchTx(
  connection: Connection,
  { creator, name, symbol, uri, firstBuySol }: LaunchParams,
): Promise<{ tx: Transaction; mintKeypair: Keypair }> {
  if (!DBC_CONFIG) throw new Error("NEXT_PUBLIC_DBC_CONFIG manquant : crée d'abord la config dans /admin.");
  const mintKeypair = grindMintKeypair();
  const lamports = Math.round(firstBuySol * LAMPORTS_PER_SOL);

  const tx = await dbcClient(connection).creator.createPoolWithFirstBuy({
    createPoolParam: {
      baseMint: mintKeypair.publicKey,
      config: DBC_CONFIG,
      name,
      symbol,
      uri,
      payer: creator,
      poolCreator: creator,
    },
    firstBuyParam:
      lamports > 0
        ? {
            buyer: creator,
            buyAmount: new BN(lamports),
            // Pool créé dans la même transaction : personne ne peut s'intercaler.
            minimumAmountOut: new BN(1),
            referralTokenAccount: null,
          }
        : undefined,
  });
  return { tx, mintKeypair };
}
