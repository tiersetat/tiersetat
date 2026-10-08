import "server-only";
import { Connection, PublicKey, type ParsedAccountData } from "@solana/web3.js";
import { memo } from "@/lib/memo";
import { PLATFORM_CURVE } from "@/lib/solana/platform";
import { decodePoolAccount } from "@/lib/solana/pool-stats";
import { SERVER_RPC_URL } from "@/lib/solana/server-rpc";
import { supabasePublic } from "@/lib/supabase/public";

export type HolderKind = "courbe" | "marche" | "createur" | "utilisateur";
export type Holder = { owner: string; amount: number; pct: number; kind: HolderKind; pseudo: string | null };

type TokenRef = { mint: string; pool: string; creator_wallet: string };

/**
 * Plus gros détenteurs d'un mème, lus sur la blockchain (cache 60 s).
 * Les comptes de la courbe et du marché (programmes, pas des personnes) sont étiquetés comme tels.
 */
export function getHolders(token: TokenRef, limit = 20): Promise<Holder[] | null> {
  return memo(`holders:${token.mint}`, 60_000, async () => {
    const connection = new Connection(SERVER_RPC_URL, { commitment: "confirmed", disableRetryOnRateLimit: true });
    const mint = new PublicKey(token.mint);
    const [largest, poolInfo] = await Promise.all([connection.getTokenLargestAccounts(mint), connection.getAccountInfo(new PublicKey(token.pool))]);
    const accounts = largest.value.filter((a) => Number(a.uiAmount ?? 0) > 0).slice(0, limit);
    if (accounts.length === 0) return [];

    const curveVault = poolInfo ? decodePoolAccount(poolInfo.data).baseVault.toBase58() : null;
    const parsed = await connection.getMultipleParsedAccounts(accounts.map((a) => a.address));
    const owners = parsed.value.map((acc) => ((acc?.data as ParsedAccountData | undefined)?.parsed?.info?.owner as string | undefined) ?? null);

    const wallets = owners.filter((o): o is string => !!o);
    const { data: profiles } = wallets.length
      ? await supabasePublic().from("profiles").select("wallet, pseudo").in("wallet", wallets)
      : { data: [] as { wallet: string; pseudo: string | null }[] };
    const pseudoOf = new Map((profiles ?? []).map((p) => [p.wallet as string, p.pseudo as string | null]));

    return accounts.map((a, i) => {
      const owner = owners[i] ?? a.address.toBase58();
      const amount = Number(a.uiAmount ?? 0);
      let kind: HolderKind = "utilisateur";
      if (a.address.toBase58() === curveVault) kind = "courbe";
      else if (owner === token.creator_wallet) kind = "createur";
      // Propriétaire hors de la courbe ed25519 = adresse de programme (marché après migration, coffre…)
      else if (!PublicKey.isOnCurve(new PublicKey(owner).toBytes())) kind = "marche";
      return { owner, amount, pct: (amount / PLATFORM_CURVE.totalSupply) * 100, kind, pseudo: pseudoOf.get(owner) ?? null };
    });
  }).catch(() => null);
}
