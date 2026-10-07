import BN from "bn.js";
import { PublicKey, VersionedTransaction, type Connection, type Transaction } from "@solana/web3.js";
import { dbcClient } from "./dbc";

export type PoolRevenue = {
  pool: string;
  /** Frais de trading revenant à la plateforme, non encore encaissés (lamports) */
  tradingLamports: bigint;
  /** Frais de création encore encaissables (vérifié par simulation), en lamports */
  creationLamports: bigint;
};

/**
 * Revenus encaissables de la plateforme pour une liste de pools.
 * Les frais de création sont vérifiés par simulation de la transaction d'encaissement :
 * c'est le programme lui-même qui dit s'ils restent à encaisser.
 */
export async function loadRevenues(connection: Connection, pools: string[], treasury: PublicKey): Promise<PoolRevenue[]> {
  const client = dbcClient(connection);
  const accounts = await client.state.getProgram().account.virtualPool.fetchMultiple(pools.map((p) => new PublicKey(p)));
  const configCache = new Map<string, Awaited<ReturnType<typeof client.state.getPoolConfig>>>();
  const { blockhash } = await connection.getLatestBlockhash();

  const out: PoolRevenue[] = [];
  for (let i = 0; i < pools.length; i++) {
    const state = accounts[i]?.poolState;
    if (!state) continue;
    const key = state.config.toBase58();
    if (!configCache.has(key)) configCache.set(key, await client.state.getPoolConfig(state.config));
    const config = configCache.get(key);

    let creationLamports = BigInt(0);
    const creationFee = config ? BigInt(config.poolCreationFee.toString()) : BigInt(0);
    if (creationFee > BigInt(0) && config?.feeClaimer.equals(treasury)) {
      try {
        const tx = await client.partner.claimPartnerPoolCreationFee({ pool: new PublicKey(pools[i]), feeReceiver: treasury });
        tx.feePayer = treasury;
        tx.recentBlockhash = blockhash;
        const sim = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
        // Part plateforme : 90 % (10 % pour le protocole Meteora)
        if (!sim.value.err) creationLamports = (creationFee * BigInt(90)) / BigInt(100);
      } catch {
        /* non encaissable */
      }
    }
    out.push({ pool: pools[i], tradingLamports: BigInt(state.partnerQuoteFee.toString()), creationLamports });
  }
  return out;
}

/** Transactions d'encaissement d'un pool (frais de trading en SOL et/ou frais de création), signées par la trésorerie. */
export async function buildClaimTxs(connection: Connection, revenue: PoolRevenue, treasury: PublicKey): Promise<Transaction[]> {
  const client = dbcClient(connection);
  const pool = new PublicKey(revenue.pool);
  const txs: Transaction[] = [];
  if (revenue.tradingLamports > BigInt(0)) {
    txs.push(
      await client.partner.claimPartnerTradingFee({
        pool,
        feeClaimer: treasury,
        payer: treasury,
        maxBaseAmount: new BN(0),
        maxQuoteAmount: new BN(revenue.tradingLamports.toString()),
      }),
    );
  }
  if (revenue.creationLamports > BigInt(0)) {
    txs.push(await client.partner.claimPartnerPoolCreationFee({ pool, feeReceiver: treasury }));
  }
  return txs;
}
