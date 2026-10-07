import { PublicKey } from "@solana/web3.js";

export const CLUSTER = "devnet" as const;

const DEFAULT_DEVNET_RPC = "https://api.devnet.solana.com";

/** Mêmes adresses mainnet/devnet (README officiel du SDK Meteora DBC). */
export const DBC_PROGRAM_ID = new PublicKey(
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
);

/**
 * Garde anti-mainnet : le MVP ne doit jamais parler à un RPC mainnet
 * sans validation explicite du propriétaire du projet.
 */
export function assertDevnetRpc(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("mainnet")) {
    throw new Error(
      "RPC refusé : Tiers-État tourne uniquement sur le DEVNET.",
    );
  }
  return url;
}

export const RPC_URL = assertDevnetRpc(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || DEFAULT_DEVNET_RPC,
);

export function explorerUrl(kind: "address" | "tx", value: string): string {
  return `https://solscan.io/${kind === "tx" ? "tx" : "account"}/${value}?cluster=${CLUSTER}`;
}

function optionalPublicKey(value: string | undefined): PublicKey | null {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

/** Wallet trésorerie : reçoit les partner fees Meteora (feeClaimer de la config). */
/** Trésorerie : reçoit la part plateforme des frais (coffre multi-signature Squads). */
export const TREASURY_WALLET = optionalPublicKey(process.env.NEXT_PUBLIC_TREASURY_WALLET);
/**
 * Wallet du fondateur : identité officielle (ex. le vrai $DETTE) et encaissement des frais
 * des mèmes créés avec les anciennes configurations, dont il reste le bénéficiaire on-chain.
 */
export const FOUNDER_WALLET = optionalPublicKey(process.env.NEXT_PUBLIC_FOUNDER_WALLET) ?? TREASURY_WALLET;

/** Config DBC actuelle de la plateforme (utilisée pour les nouveaux tokens), créée depuis /admin. */
export const DBC_CONFIG = optionalPublicKey(process.env.NEXT_PUBLIC_DBC_CONFIG);

/**
 * Anciennes configs de la plateforme (séparées par des virgules) : leurs tokens restent
 * échangeables et indexés après un changement de paramètres économiques.
 */
export const LEGACY_DBC_CONFIGS = (process.env.NEXT_PUBLIC_DBC_LEGACY_CONFIGS ?? "")
  .split(",")
  .map((v) => optionalPublicKey(v.trim()))
  .filter((k): k is PublicKey => k !== null);

/** Toutes les configs reconnues par la plateforme. */
export function isPlatformConfig(config: PublicKey): boolean {
  return [DBC_CONFIG, ...LEGACY_DBC_CONFIGS].some((c) => c?.equals(config));
}

/** Adresse publique du site (liens de partage, images Open Graph). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://tiersetat.vercel.app").replace(/\/$/, "");
