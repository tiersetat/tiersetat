import "server-only";
import { Connection, PublicKey, type VersionedTransactionResponse } from "@solana/web3.js";
import { DBC_PROGRAM_ID, isPlatformConfig } from "@/lib/solana/config";
import { MIGRATION_QUOTE_THRESHOLD_LAMPORTS, PLATFORM_CURVE } from "@/lib/solana/platform";
import { computePoolStats, decodePoolAccount } from "@/lib/solana/pool-stats";
import { supabaseAdmin } from "@/lib/supabase/server";

export type ParsedTrade = {
  trader: string;
  side: "buy" | "sell";
  /** SOL entrés (achat) ou sortis (vente) du pool, frais compris */
  solAmount: number;
  tokenAmount: number;
  priceSol: number;
};

type TokenBalance = NonNullable<NonNullable<VersionedTransactionResponse["meta"]>["postTokenBalances"]>[number];

/**
 * Extrait un trade DBC d'une transaction confirmée à partir des soldes avant/après :
 * - tokens : variation du compte du trader (le coffre du pool peut être créé dans la même transaction) ;
 * - SOL : variation du coffre quote (WSOL) du pool.
 * Pur et testable : aucune requête réseau.
 */
export function parseTrade(
  tx: Pick<VersionedTransactionResponse, "meta" | "transaction">,
  mint: string,
  vaults: { base: string; quote: string },
): ParsedTrade | null {
  const meta = tx.meta;
  if (!meta || meta.err) return null;
  const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: meta.loadedAddresses });
  const keyOf = (b: TokenBalance) => keys.get(b.accountIndex)?.toBase58();

  const delta = (predicate: (b: TokenBalance) => boolean) => {
    const sum = new Map<string, { owner: string; delta: bigint }>();
    for (const [list, sign] of [[meta.preTokenBalances ?? [], -BigInt(1)], [meta.postTokenBalances ?? [], BigInt(1)]] as const) {
      for (const b of list) {
        if (!predicate(b)) continue;
        const key = keyOf(b) ?? String(b.accountIndex);
        const entry = sum.get(key) ?? { owner: b.owner ?? "", delta: BigInt(0) };
        entry.delta += sign * BigInt(b.uiTokenAmount.amount);
        sum.set(key, entry);
      }
    }
    return sum;
  };

  // Compte du trader : solde du token hors coffre du pool, plus forte variation
  const traderEntries = [...delta((b) => b.mint === mint && keyOf(b) !== vaults.base).values()].filter((e) => e.delta !== BigInt(0));
  if (traderEntries.length === 0) return null;
  const trader = traderEntries.sort((a, b) => (abs(b.delta) > abs(a.delta) ? 1 : -1))[0];

  const quote = delta((b) => keyOf(b) === vaults.quote).get(vaults.quote);
  if (!quote || quote.delta === BigInt(0)) return null;

  const tokenAmount = Number(abs(trader.delta)) / 10 ** PLATFORM_CURVE.tokenDecimals;
  const solAmount = Number(abs(quote.delta)) / 1e9;
  if (!tokenAmount || !solAmount) return null;
  return {
    trader: trader.owner,
    side: trader.delta > BigInt(0) ? "buy" : "sell",
    solAmount,
    tokenAmount,
    priceSol: solAmount / tokenAmount,
  };
}

function abs(v: bigint) {
  return v < BigInt(0) ? -v : v;
}

export async function waitForTransaction(connection: Connection, signature: string) {
  for (let i = 0; i < 8; i++) {
    const tx = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    if (tx) return tx;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

export type IndexResult =
  | { ok: true; trade: ParsedTrade | null }
  | { ok: false; status: number; error: string };

/**
 * Vérifie on-chain puis indexe le trade d'une transaction pour un mème connu,
 * et met à jour market cap / progression du mème. Idempotent (clé = signature).
 */
export async function indexTrade(
  connection: Connection,
  signature: string,
  token: { mint: string; pool: string },
  knownTx?: VersionedTransactionResponse | null,
): Promise<IndexResult> {
  const tx = knownTx ?? (await waitForTransaction(connection, signature));
  if (!tx) return { ok: false, status: 404, error: "Transaction introuvable (réessaie dans un instant)." };
  if (tx.meta?.err) return { ok: false, status: 422, error: "La transaction a échoué on-chain." };
  const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
  const all = [...keys.staticAccountKeys, ...(keys.accountKeysFromLookups?.writable ?? []), ...(keys.accountKeysFromLookups?.readonly ?? [])].map((k) => k.toBase58());
  if (!all.includes(DBC_PROGRAM_ID.toBase58()) || !all.includes(token.pool)) {
    return { ok: false, status: 422, error: "Cette transaction ne concerne pas ce mème." };
  }

  const account = await connection.getAccountInfo(new PublicKey(token.pool));
  if (!account) return { ok: false, status: 422, error: "Pool introuvable." };
  const pool = decodePoolAccount(account.data);
  if (!isPlatformConfig(pool.config)) return { ok: false, status: 422, error: "Pool hors config Tiers-État." };

  const trade = parseTrade(tx, token.mint, { base: pool.baseVault.toBase58(), quote: pool.quoteVault.toBase58() });
  const db = supabaseAdmin();
  const stats = computePoolStats(pool, MIGRATION_QUOTE_THRESHOLD_LAMPORTS);
  const blockTime = new Date((tx.blockTime ?? Date.now() / 1000) * 1000).toISOString();

  if (trade) {
    const { error: pErr } = await db.from("profiles").upsert({ wallet: trade.trader }, { onConflict: "wallet", ignoreDuplicates: true });
    if (pErr) throw pErr;
    const { error } = await db.from("trades").upsert(
      {
        signature,
        mint: token.mint,
        trader_wallet: trade.trader,
        side: trade.side,
        sol_amount: trade.solAmount,
        token_amount: trade.tokenAmount,
        price_sol: trade.priceSol,
        block_time: blockTime,
      },
      { onConflict: "signature", ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  const { error: uErr } = await db
    .from("tokens")
    .update({
      market_cap_sol: stats.marketCapSol,
      curve_progress: stats.progress,
      migrated: pool.isMigrated,
      ...(trade ? { last_trade_at: blockTime } : {}),
    })
    .eq("mint", token.mint);
  if (uErr) throw uErr;
  return { ok: true, trade };
}
