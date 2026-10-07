import BN from "bn.js";
import { PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import { dbcClient } from "./dbc";

/** Frais de trading revenant au créateur, non encore encaissés (en lamports), par pool. */
export async function loadCreatorEarnings(connection: Connection, pools: string[]): Promise<Map<string, bigint>> {
  if (pools.length === 0) return new Map();
  const accounts = await dbcClient(connection)
    .state.getProgram()
    .account.virtualPool.fetchMultiple(pools.map((p) => new PublicKey(p)));
  return new Map(pools.map((p, i) => [p, BigInt(accounts[i]?.poolState.creatorQuoteFee.toString() ?? "0")]));
}

/** Transaction d'encaissement des frais créateur d'un pool (en SOL), signée par le créateur. */
export function buildCreatorClaimTx(connection: Connection, creator: PublicKey, pool: string, lamports: bigint): Promise<Transaction> {
  return dbcClient(connection).creator.claimCreatorTradingFee({
    creator,
    payer: creator,
    pool: new PublicKey(pool),
    maxBaseAmount: new BN(0),
    maxQuoteAmount: new BN(lamports.toString()),
  });
}
