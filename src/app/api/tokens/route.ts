import { NextResponse, type NextRequest } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { deriveDbcPoolAddress, deriveMintMetadata } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getSessionWallet } from "@/lib/auth/session";
import { getBlockedWords } from "@/lib/blocked-words";
import { handleApiError, jsonError } from "@/lib/api";
import { gatewayPrefix } from "@/lib/ipfs";
import { moderate } from "@/lib/moderation";
import { DBC_CONFIG, DBC_PROGRAM_ID } from "@/lib/solana/config";
import { SERVER_RPC_URL } from "@/lib/solana/server-rpc";
import { dbcClient } from "@/lib/solana/dbc";
import { decodeMetaplexMetadata } from "@/lib/solana/metadata";
import { computePoolStats } from "@/lib/solana/pool-stats";
import { supabaseAdmin } from "@/lib/supabase/server";
import { indexTrade, waitForTransaction } from "@/lib/trades";
import { registerTokenSchema } from "@/lib/validators";
import { rateLimit, tooMany } from "@/lib/rate-limit";

/**
 * Étape 2 du lancement : indexe un mème APRÈS vérification on-chain.
 * Le client n'envoie que la signature et le mint : tout le reste est relu sur la blockchain.
 */
export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Session expirée : signe à nouveau pour entrer.");
    if (!rateLimit(`launch:${wallet}`, 10, 60 * 60_000)) return tooMany(60);
    if (!DBC_CONFIG) return jsonError(503, "Config DBC absente sur le serveur.");

    const { signature, mint, source } = registerTokenSchema.parse(await req.json());
    const mintKey = new PublicKey(mint);
    const connection = new Connection(SERVER_RPC_URL, "confirmed");

    // 1. La transaction existe, a réussi et touche le programme DBC
    const tx = await waitForTransaction(connection, signature);
    if (!tx) return jsonError(404, "Transaction introuvable sur le devnet (réessaie dans un instant).");
    if (tx.meta?.err) return jsonError(422, "La transaction a échoué on-chain.");
    const keys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((k) => k.toBase58());
    if (!keys.includes(DBC_PROGRAM_ID.toBase58()) || !keys.includes(mint)) {
      return jsonError(422, "Cette transaction ne crée pas ce mème.");
    }

    // 2. Le pool existe, utilise NOTRE config et appartient au wallet connecté
    const poolAddress = deriveDbcPoolAddress(NATIVE_MINT, mintKey, DBC_CONFIG);
    const client = dbcClient(connection);
    const [poolAccount, config] = await Promise.all([
      client.state.getPool(poolAddress),
      client.state.getPoolConfig(DBC_CONFIG),
    ]);
    // SDK ≥ 1.5 : l'état du pool est enveloppé dans `poolState`
    const pool = poolAccount?.poolState;
    if (!pool || !config) return jsonError(422, "Pool introuvable.");
    if (!pool.config.equals(DBC_CONFIG)) return jsonError(422, "Ce pool n'utilise pas la config Tiers-État.");
    if (pool.creator.toBase58() !== wallet) return jsonError(403, "Ce mème n'a pas été frappé par ton wallet.");

    // 3. Nom / ticker / URI lus dans les métadonnées on-chain (pas dans la requête)
    const metaAccount = await connection.getAccountInfo(deriveMintMetadata(mintKey));
    if (!metaAccount) return jsonError(422, "Métadonnées on-chain introuvables.");
    const onchain = decodeMetaplexMetadata(metaAccount.data);
    if (!onchain.uri.startsWith(gatewayPrefix())) {
      return jsonError(422, "Les métadonnées doivent être hébergées par Tiers-État.");
    }
    const offchain = (await fetch(onchain.uri, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)) as {
      description?: string;
      image?: string;
      extensions?: { twitter?: string; website?: string };
    } | null;
    if (!offchain?.image?.startsWith(gatewayPrefix())) {
      return jsonError(422, "Image du mème introuvable sur IPFS.");
    }

    // 4. Modération serveur (fait foi) : un contenu interdit est indexé masqué
    const verdict = moderate([onchain.name, onchain.symbol, offchain.description ?? ""], await getBlockedWords());
    const stats = computePoolStats(pool, config.migrationQuoteThreshold);

    const db = supabaseAdmin();
    const { error: profileError } = await db
      .from("profiles")
      .upsert({ wallet }, { onConflict: "wallet", ignoreDuplicates: true });
    if (profileError) throw profileError;

    const { error } = await db.from("tokens").upsert(
      {
        mint,
        pool: poolAddress.toBase58(),
        config: DBC_CONFIG.toBase58(),
        creator_wallet: wallet,
        name: onchain.name.slice(0, 32),
        ticker: onchain.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10).padEnd(2, "X"),
        description: offchain.description?.slice(0, 500) || null,
        image_url: offchain.image,
        metadata_uri: onchain.uri,
        twitter_url: offchain.extensions?.twitter ?? null,
        website_url: offchain.extensions?.website ?? null,
        source_url: source ?? null,
        launch_signature: signature,
        market_cap_sol: stats.marketCapSol,
        curve_progress: stats.progress,
        migrated: pool.isMigrated === 1,
        hidden: !verdict.ok,
        hidden_reason: verdict.ok ? null : `Modération automatique : ${verdict.reason}`,
        hidden_at: verdict.ok ? null : new Date().toISOString(),
      },
      { onConflict: "mint", ignoreDuplicates: true },
    );
    if (error) throw error;

    // Premier achat éventuel inclus dans la transaction de lancement
    await indexTrade(connection, signature, { mint, pool: poolAddress.toBase58() }, tx).catch((e) =>
      console.error("indexTrade (lancement)", e),
    );

    return NextResponse.json({ mint, hidden: !verdict.ok });
  } catch (err) {
    return handleApiError(err);
  }
}
