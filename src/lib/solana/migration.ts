import { PublicKey, type Connection, type Keypair, type Transaction } from "@solana/web3.js";
import { DAMM_V2_MIGRATION_FEE_ADDRESS } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { CLUSTER } from "./config";
import { dbcClient } from "./dbc";

/**
 * Migration d'un pool DBC rempli vers Meteora DAMM v2.
 * Permissionless : n'importe quel wallet peut la déclencher une fois la courbe complète
 * (les robots de Meteora ne couvrent que le mainnet et les seuils ≥ 10 SOL).
 */
export async function buildMigrationTx(
  connection: Connection,
  payer: PublicKey,
  pool: string,
): Promise<{ tx: Transaction; signers: Keypair[] }> {
  const client = dbcClient(connection);
  const virtualPool = await client.state.getPool(pool);
  if (!virtualPool) throw new Error("Pool introuvable.");
  const config = await client.state.getPoolConfig(virtualPool.poolState.config);
  if (!config) throw new Error("Config introuvable.");
  // Config de frais du pool DAMM v2 correspondant à l'option de frais de migration choisie
  const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[config.migrationFeeOption];
  if (!dammConfig) throw new Error("Option de frais de migration non prise en charge.");

  const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } = await client.migration.migrateToDammV2({
    payer,
    pool: new PublicKey(pool),
    dammConfig,
  });
  return { tx: transaction, signers: [firstPositionNftKeypair, secondPositionNftKeypair] };
}

/** Où échanger un token après sa migration. */
export function postMigrationLinks(mint: string): { label: string; href: string }[] {
  if (CLUSTER !== "devnet") {
    return [{ label: "Échanger sur Jupiter", href: `https://jup.ag/swap/SOL-${mint}` }];
  }
  // Jupiter ne prend pas en charge le devnet : on renvoie vers l'explorateur
  return [{ label: "Voir le token sur Solscan (devnet)", href: `https://solscan.io/token/${mint}?cluster=devnet` }];
}
