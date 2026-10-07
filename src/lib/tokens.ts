import "server-only";
import { Connection, PublicKey } from "@solana/web3.js";
import { SERVER_RPC_URL } from "@/lib/solana/server-rpc";
import { MIGRATION_QUOTE_THRESHOLD_LAMPORTS } from "@/lib/solana/platform";
import { computePoolStats, decodePoolAccount } from "@/lib/solana/pool-stats";
import { creatorSoldByMint } from "@/lib/creator-trust-data";
import { memo } from "@/lib/memo";
import { supabaseAdmin } from "@/lib/supabase/server";

export type TokenCard = {
  mint: string;
  pool: string;
  name: string;
  ticker: string;
  image_url: string;
  market_cap_sol: number;
  curve_progress: number;
  migrated: boolean;
  created_at: string;
  creator_wallet: string;
  /** Part de ses tokens revendue par le créateur (0–100), null s'il n'a rien acheté */
  creator_sold_pct?: number | null;
};

export const TABS = {
  nouveaux: "Nouveaux",
  tendances: "Tendances",
  bastille: "Bientôt sur un DEX",
} as const;
export type Tab = keyof typeof TABS;

export function parseTab(value: unknown): Tab {
  return typeof value === "string" && value in TABS ? (value as Tab) : "nouveaux";
}

const COLUMNS = "mint, pool, name, ticker, image_url, market_cap_sol, curve_progress, migrated, created_at, creator_wallet";
const LIMIT = 48;
/** Seuil d'affichage de l'onglet « Bientôt sur un DEX » (progression de la courbe). */
export const BASTILLE_MIN_PROGRESS = 50;

/** Mèmes visibles pour un onglet de la place publique. */
/** Mèmes visibles pour un onglet (cache 5 s : le temps réel complète côté navigateur). */
export function listTokens(tab: Tab): Promise<TokenCard[]> {
  return memo(`tokens:${tab}`, 5_000, async () => {
    const tokens = await fetchTokens(tab);
    // Transparence : combien le créateur a déjà revendu, affiché sur chaque carte
    const sold = await creatorSoldByMint(tokens).catch(() => new Map<string, number | null>());
    return tokens.map((t) => ({ ...t, creator_sold_pct: sold.get(t.mint) ?? null }));
  });
}

async function fetchTokens(tab: Tab): Promise<TokenCard[]> {
  const db = supabaseAdmin();
  const base = () => db.from("tokens").select(COLUMNS).eq("hidden", false);

  if (tab === "bastille") {
    const { data, error } = await base()
      .eq("migrated", false)
      .gte("curve_progress", BASTILLE_MIN_PROGRESS)
      .order("curve_progress", { ascending: false })
      .limit(LIMIT);
    if (error) throw error;
    return refreshStats(data as TokenCard[]);
  }

  if (tab === "tendances") {
    // Volume des dernières 24 h ; à volume égal, la market cap départage.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [{ data: trades, error: tErr }, { data: tokens, error }] = await Promise.all([
      db.from("trades").select("mint, sol_amount").gte("block_time", since).limit(5000),
      base().order("market_cap_sol", { ascending: false }).limit(200),
    ]);
    if (tErr) throw tErr;
    if (error) throw error;
    const volume = new Map<string, number>();
    for (const t of trades ?? []) volume.set(t.mint, (volume.get(t.mint) ?? 0) + Number(t.sol_amount));
    const sorted = (tokens as TokenCard[])
      .sort((a, b) => (volume.get(b.mint) ?? 0) - (volume.get(a.mint) ?? 0) || b.market_cap_sol - a.market_cap_sol)
      .slice(0, LIMIT);
    return refreshStats(sorted);
  }

  const { data, error } = await base().order("created_at", { ascending: false }).limit(LIMIT);
  if (error) throw error;
  return refreshStats(data as TokenCard[]);
}

// --- Rafraîchissement des stats depuis la blockchain (throttlé) ---------------

const lastRefresh = new Map<string, number>();
const REFRESH_MS = 30_000;

/**
 * Relit l'état on-chain des pools affichés (une requête groupée) et met à jour
 * market cap / progression / migration en base. Au plus une fois toutes les 30 s par pool.
 */
async function refreshStats(tokens: TokenCard[]): Promise<TokenCard[]> {
  const now = Date.now();
  const stale = tokens.filter((t) => now - (lastRefresh.get(t.mint) ?? 0) > REFRESH_MS);
  if (stale.length === 0) return tokens;
  try {
    // Lecture groupée et décodage direct (pas de SDK Meteora dans les pages serveur)
    const accounts = await new Connection(SERVER_RPC_URL, "confirmed").getMultipleAccountsInfo(
      stale.map((t) => new PublicKey(t.pool)),
    );
    const updates = stale.flatMap((token, i) => {
      const account = accounts[i];
      if (!account) return [];
      const pool = decodePoolAccount(account.data);
      lastRefresh.set(token.mint, now);
      const stats = computePoolStats(pool, MIGRATION_QUOTE_THRESHOLD_LAMPORTS);
      token.market_cap_sol = stats.marketCapSol;
      token.curve_progress = stats.progress;
      token.migrated = pool.isMigrated;
      return [{ mint: token.mint, market_cap_sol: stats.marketCapSol, curve_progress: stats.progress, migrated: token.migrated }];
    });
    await Promise.all(
      updates.map(({ mint, ...fields }) => supabaseAdmin().from("tokens").update(fields).eq("mint", mint)),
    );
  } catch (err) {
    // Le RPC public peut limiter : on affiche les dernières valeurs connues.
    console.error("refreshStats", err);
  }
  return tokens;
}

export type PlatformStats = { tokens: number; volumeSol: number; traders: number };

/** Chiffres clés de la page d'accueil (tokens visibles, volume total, traders uniques). */
/** Chiffres de la plateforme (cache 15 s). */
export function getStats(): Promise<PlatformStats> {
  return memo("stats", 15_000, fetchStats);
}

async function fetchStats(): Promise<PlatformStats> {
  const db = supabaseAdmin();
  const [{ count, error: cErr }, { data: trades, error: tErr }] = await Promise.all([
    db.from("tokens").select("mint", { count: "exact", head: true }).eq("hidden", false),
    // Volume et traders des seuls tokens visibles (jointure sur tokens.hidden)
    db.from("trades").select("sol_amount, trader_wallet, tokens!inner(hidden)").eq("tokens.hidden", false).limit(10000),
  ]);
  if (cErr) throw cErr;
  if (tErr) throw tErr;
  const volumeSol = (trades ?? []).reduce((sum, t) => sum + Number(t.sol_amount), 0);
  const traders = new Set((trades ?? []).map((t) => t.trader_wallet)).size;
  return { tokens: count ?? 0, volumeSol, traders };
}
