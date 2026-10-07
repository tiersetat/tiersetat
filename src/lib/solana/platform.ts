/**
 * Paramètres économiques de la plateforme (devnet), sans dépendance au SDK Meteora
 * pour pouvoir être importés partout (pages serveur, navigateur).
 */
export const PLATFORM_CURVE = {
  totalSupply: 1_000_000_000,
  tokenDecimals: 6,
  /** Market cap de départ, en SOL */
  initialMarketCapSol: 2,
  /** Market cap à laquelle le mème « prend la Bastille » (migration DAMM v2), en SOL */
  migrationMarketCapSol: 20,
  /** Frais de trading sur la courbe : 1 % */
  tradingFeeBps: 100,
  /**
   * Part des frais de trading reversée au créateur, après les 20 % du protocole Meteora.
   * 70 % → pour 1 SOL échangé : 0,0056 SOL créateur, 0,0024 SOL plateforme, 0,002 SOL Meteora.
   */
  creatorTradingFeePercentage: 70,
  /** Frais de création d'un token (anti-spam), en SOL : 90 % plateforme, 10 % Meteora */
  poolCreationFeeSol: 0.02,
} as const;

/**
 * SOL à lever sur la courbe avant migration (en lamports), tel que calculé par
 * buildPlatformCurve() et inscrit dans la config on-chain (vérifié par les tests).
 */
export const MIGRATION_QUOTE_THRESHOLD_LAMPORTS = BigInt("4805061467");
