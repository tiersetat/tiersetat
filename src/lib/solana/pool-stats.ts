import { PublicKey } from "@solana/web3.js";
import { PLATFORM_CURVE } from "./platform";

export type PoolStats = {
  /** Prix d'un token, en SOL */
  priceSol: number;
  /** Market cap (offre totale × prix), en SOL */
  marketCapSol: number;
  /** Progression de la bonding curve vers la migration, 0–100 */
  progress: number;
};

type Amount = { toString(): string } | bigint;
const Q64 = 2 ** 64;

/**
 * Statistiques affichées à partir de l'état du pool. Calcul indépendant du SDK
 * (prix = (sqrtPrice / 2^64)² × 10^(décimales base − quote)), vérifié contre lui en test.
 */
export function computePoolStats(pool: { sqrtPrice: Amount; quoteReserve: Amount }, migrationQuoteThreshold: Amount): PoolStats {
  const sqrt = Number(pool.sqrtPrice.toString()) / Q64;
  const priceSol = sqrt * sqrt * 10 ** (PLATFORM_CURVE.tokenDecimals - 9);
  const threshold = Number(migrationQuoteThreshold.toString());
  const reserve = Number(pool.quoteReserve.toString());
  const progress = threshold > 0 ? Math.min(100, (reserve / threshold) * 100) : 0;
  return {
    priceSol,
    marketCapSol: priceSol * PLATFORM_CURVE.totalSupply,
    progress: Math.round(progress * 100) / 100,
  };
}

export type DecodedPool = {
  config: PublicKey;
  creator: PublicKey;
  baseMint: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  quoteReserve: bigint;
  sqrtPrice: bigint;
  isMigrated: boolean;
};

/**
 * Décode un compte VirtualPool du programme DBC (8 octets de discriminant + PoolState, repr C).
 * Offsets tirés de l'IDL officiel et vérifiés contre le décodage du SDK (npm run test:devnet).
 */
export function decodePoolAccount(data: Uint8Array): DecodedPool {
  if (data.length < 309) throw new Error("Compte de pool trop court");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const u64 = (o: number) => view.getBigUint64(o, true);
  const u128 = (o: number) => u64(o) + (u64(o + 8) << BigInt(64));
  return {
    config: new PublicKey(data.subarray(72, 104)),
    creator: new PublicKey(data.subarray(104, 136)),
    baseMint: new PublicKey(data.subarray(136, 168)),
    baseVault: new PublicKey(data.subarray(168, 200)),
    quoteVault: new PublicKey(data.subarray(200, 232)),
    quoteReserve: u64(240),
    sqrtPrice: u128(280),
    isMigrated: data[305] === 1,
  };
}
