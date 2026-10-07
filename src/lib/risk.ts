import "server-only";
import { Connection, PublicKey, type ParsedAccountData } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SERVER_RPC_URL } from "@/lib/solana/server-rpc";
import { PLATFORM_CURVE } from "@/lib/solana/platform";
import { decodePoolAccount } from "@/lib/solana/pool-stats";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { RiskReport } from "@/lib/risk-flags";

const TOTAL = PLATFORM_CURVE.totalSupply;
const cache = new Map<string, { at: number; report: RiskReport }>();
const TTL_MS = 60_000;

type TokenRef = { mint: string; pool: string; creator_wallet: string; created_at: string };

/**
 * Rassemble les indicateurs de transparence d'un token.
 * Chaque source est indépendante : une donnée indisponible (RPC limité) devient `null`
 * au lieu de faire échouer la page.
 */
export async function getRiskReport(token: TokenRef): Promise<RiskReport> {
  const hit = cache.get(token.mint);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.report;

  // Pas de nouvelles tentatives en boucle sur le RPC public quand il limite.
  const connection = new Connection(SERVER_RPC_URL, { commitment: "confirmed", disableRetryOnRateLimit: true });
  const mint = new PublicKey(token.mint);
  const creatorAta = getAssociatedTokenAddressSync(mint, new PublicKey(token.creator_wallet), true);

  const [mintInfo, poolInfo, creatorBal, largest, trades] = await Promise.allSettled([
    connection.getParsedAccountInfo(mint),
    connection.getAccountInfo(new PublicKey(token.pool)),
    connection.getTokenAccountBalance(creatorAta),
    connection.getTokenLargestAccounts(mint),
    supabaseAdmin().from("trades").select("trader_wallet, side, token_amount").eq("mint", token.mint).limit(5000),
  ]);

  const parsed = mintInfo.status === "fulfilled" ? (mintInfo.value.value?.data as ParsedAccountData | undefined)?.parsed?.info : undefined;
  const pool = poolInfo.status === "fulfilled" && poolInfo.value ? decodePoolAccount(poolInfo.value.data) : null;
  const tradeRows = trades.status === "fulfilled" ? (trades.value.data ?? []) : [];

  // Concentration : blockchain si possible (hors coffre de la courbe), sinon estimation par les échanges indexés
  let top10Pct: number | null = null;
  let top10Source: RiskReport["top10Source"] = null;
  if (largest.status === "fulfilled") {
    const vault = pool?.baseVault.toBase58();
    const holders = largest.value.value.filter((a) => a.address.toBase58() !== vault).slice(0, 10);
    top10Pct = (holders.reduce((s, a) => s + Number(a.uiAmount ?? 0), 0) / TOTAL) * 100;
    top10Source = "chain";
  } else if (tradeRows.length > 0) {
    const net = new Map<string, number>();
    for (const t of tradeRows) {
      net.set(t.trader_wallet, (net.get(t.trader_wallet) ?? 0) + (t.side === "buy" ? 1 : -1) * Number(t.token_amount));
    }
    const top = [...net.values()].filter((v) => v > 0).sort((a, b) => b - a).slice(0, 10);
    top10Pct = (top.reduce((s, v) => s + v, 0) / TOTAL) * 100;
    top10Source = "trades";
  }

  const report: RiskReport = {
    ageMinutes: (Date.now() - Date.parse(token.created_at)) / 60000,
    creatorPct:
      creatorBal.status === "fulfilled"
        ? (Number(creatorBal.value.value.uiAmount ?? 0) / TOTAL) * 100
        : // Compte inexistant = le créateur ne détient rien
          creatorBal.reason instanceof Error && /could not find account|Invalid param/i.test(creatorBal.reason.message)
          ? 0
          : null,
    creatorSold: tradeRows.some((t) => t.trader_wallet === token.creator_wallet && t.side === "sell"),
    top10Pct,
    top10Source,
    reserveSol: pool ? Number(pool.quoteReserve) / 1e9 : null,
    mintRevoked: parsed ? parsed.mintAuthority === null : null,
    freezeRevoked: parsed ? parsed.freezeAuthority === null : null,
  };
  cache.set(token.mint, { at: Date.now(), report });
  return report;
}
