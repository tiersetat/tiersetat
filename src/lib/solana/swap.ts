import BN from "bn.js";
import { PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import { getCurrentPoint, SwapMode, type PoolConfig, type VirtualPool } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { dbcClient } from "./dbc";

export type Side = "buy" | "sell";

export type PoolSnapshot = { virtualPool: VirtualPool; config: PoolConfig; currentPoint: BN };

/** État du pool nécessaire à un devis (à recharger avant chaque transaction). */
export async function loadPoolSnapshot(connection: Connection, pool: string): Promise<PoolSnapshot> {
  const client = dbcClient(connection);
  const virtualPool = await client.state.getPool(pool);
  if (!virtualPool) throw new Error("Pool introuvable sur le devnet.");
  const config = await client.state.getPoolConfig(virtualPool.poolState.config);
  if (!config) throw new Error("Config du pool introuvable.");
  const currentPoint = await getCurrentPoint(connection, config.activationType);
  return { virtualPool, config, currentPoint };
}

export type Quote = {
  /** Tokens (achat) ou lamports (vente) reçus */
  outputAmount: BN;
  /** Minimum accepté compte tenu du slippage */
  minimumAmountOut: BN;
  /** Montant d'entrée réellement utilisé (frais inclus) */
  amountUsed: BN;
  /** Part de l'entrée non utilisée et rendue : la courbe se termine avant (achat final) */
  amountLeft: BN;
  /** Frais totaux de l'échange en % (1 % en temps normal, plus pendant la minute anti-robots) */
  feePct: number;
};

/**
 * Devis : achat = SOL → tokens en remplissage partiel (le dernier achat d'une courbe
 * ne prend que ce qu'il faut pour la compléter, le reste est rendu), vente = tokens → SOL exact.
 * `amountIn` en unités de base (lamports ou plus petite unité du token).
 */
export function quote(connection: Connection, snap: PoolSnapshot, side: Side, amountIn: BN, slippageBps: number): Quote {
  const base = {
    virtualPool: snap.virtualPool,
    config: snap.config,
    swapBaseForQuote: side === "sell",
    hasReferral: false,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint: snap.currentPoint,
    slippageBps,
  };
  const q = dbcClient(connection).pool.swapQuote2(
    side === "buy" ? { ...base, swapMode: SwapMode.PartialFill, amountIn } : { ...base, swapMode: SwapMode.ExactIn, amountIn },
  );
  const outputAmount = new BN(q.outputAmount.toString());
  // Frais prélevés en SOL : sur l'entrée à l'achat, sur la sortie à la vente
  const fees = Number(q.tradingFee.toString()) + Number(q.protocolFee.toString()) + Number(q.referralFee.toString());
  const feeBase = side === "buy" ? Number(q.includedFeeInputAmount.toString()) : Number(q.outputAmount.toString()) + fees;
  const feePct = feeBase > 0 ? (fees / feeBase) * 100 : 0;
  return {
    feePct,
    outputAmount,
    minimumAmountOut: q.minimumAmountOut ?? outputAmount.muln(10_000 - slippageBps).divn(10_000),
    amountUsed: new BN(q.includedFeeInputAmount.toString()),
    amountLeft: new BN(q.amountLeft.toString()),
  };
}

export function buildSwapTx(
  connection: Connection,
  params: { owner: PublicKey; pool: string; side: Side; amountIn: BN; minimumAmountOut: BN },
): Promise<Transaction> {
  const common = {
    owner: params.owner,
    pool: new PublicKey(params.pool),
    amountIn: params.amountIn,
    minimumAmountOut: params.minimumAmountOut,
    swapBaseForQuote: params.side === "sell",
    referralTokenAccount: null,
  };
  return dbcClient(connection).pool.swap2(
    params.side === "buy" ? { ...common, swapMode: SwapMode.PartialFill } : { ...common, swapMode: SwapMode.ExactIn },
  );
}
