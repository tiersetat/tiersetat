import { CLUSTER } from "./config";

/** Réseau principal (argent réel) : réglage « Accessible » choisi pour le lancement. */
const MAINNET = (CLUSTER as string) === "mainnet-beta";

/** Réglages de la courbe selon le réseau (capitalisations en SOL). */
export const CURVE_PRESETS = {
  /** Bêta : petits montants fictifs pour tester la Bastille facilement */
  devnet: { initialMarketCapSol: 2, migrationMarketCapSol: 20, thresholdLamports: "4805061467" },
  /** Lancement réel : départ ~10 SOL, Bastille après ~24 SOL achetés (≥ 10 SOL : migration automatique par les robots Meteora) */
  mainnet: { initialMarketCapSol: 10, migrationMarketCapSol: 100, thresholdLamports: "24025307335" },
} as const;
const PRESET = MAINNET ? CURVE_PRESETS.mainnet : CURVE_PRESETS.devnet;

/**
 * Paramètres économiques de la plateforme, sans dépendance au SDK Meteora
 * pour pouvoir être importés partout (pages serveur, navigateur).
 */
export const PLATFORM_CURVE = {
  totalSupply: 1_000_000_000,
  tokenDecimals: 6,
  /** Market cap de départ, en SOL */
  initialMarketCapSol: PRESET.initialMarketCapSol,
  /** Market cap à laquelle le mème « prend la Bastille » (migration DAMM v2), en SOL */
  migrationMarketCapSol: PRESET.migrationMarketCapSol,
  /** Frais de trading sur la courbe : 1 % */
  tradingFeeBps: 100,
  /**
   * Part des frais de trading reversée au créateur, après les 20 % du protocole Meteora.
   * 70 % → pour 1 SOL échangé : 0,0056 SOL créateur, 0,0024 SOL plateforme, 0,002 SOL Meteora.
   */
  creatorTradingFeePercentage: 70,
  /** Frais de création d'un token (anti-spam), en SOL : 90 % plateforme, 10 % Meteora */
  poolCreationFeeSol: 0.02,
  /**
   * Anti-robots : frais de départ très élevés qui redescendent (décroissance exponentielle,
   * seconde par seconde) jusqu'aux frais normaux. Le premier achat du créateur, dans la
   * transaction de lancement, reste au tarif normal.
   */
  antiBot: { startingFeeBps: 5000, durationSec: 60 },
} as const;

/**
 * SOL à lever sur la courbe avant migration (en lamports), tel que calculé par
 * buildPlatformCurve() et inscrit dans la config on-chain (vérifié par les tests).
 */
export const MIGRATION_QUOTE_THRESHOLD_LAMPORTS = BigInt(PRESET.thresholdLamports);
