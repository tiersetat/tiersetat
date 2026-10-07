import "server-only";
import { assertDevnetRpc, RPC_URL } from "@/lib/solana/config";

/**
 * RPC des routes serveur : clé privée sans restriction de domaine (SOLANA_RPC_URL),
 * distincte de la clé publique du navigateur, elle restreinte au domaine du site.
 */
export const SERVER_RPC_URL = assertDevnetRpc(process.env.SOLANA_RPC_URL || RPC_URL);
