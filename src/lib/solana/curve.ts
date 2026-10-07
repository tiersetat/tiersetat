import {
  ActivationType,
  BaseFeeMode,
  buildCurveWithMarketCap,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
  type ConfigParameters,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { PLATFORM_CURVE } from "./platform";

export { PLATFORM_CURVE } from "./platform";

/** Construit les paramètres de config Meteora DBC (validés par validateConfigParameters du SDK). */
export function buildPlatformCurve(): ConfigParameters {
  return buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE, // SOL
      // Métadonnées figées : personne ne peut renommer un mème après coup.
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: PLATFORM_CURVE.totalSupply,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: PLATFORM_CURVE.tradingFeeBps,
          endingFeeBps: PLATFORM_CURVE.tradingFeeBps,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: true,
      collectFeeMode: CollectFeeMode.QuoteToken, // frais encaissés en SOL
      creatorTradingFeePercentage: PLATFORM_CURVE.creatorTradingFeePercentage,
      poolCreationFee: PLATFORM_CURVE.poolCreationFeeSol,
      // Création de pool + premier achat dans la même transaction (étape 3)
      enableFirstSwapWithMinFee: true,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps100,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    },
    // Liquidité du pool migré verrouillée à 100 % : pas de « rug » possible sur la LP.
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: 50,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 50,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    initialMarketCap: PLATFORM_CURVE.initialMarketCapSol,
    migrationMarketCap: PLATFORM_CURVE.migrationMarketCapSol,
  });
}

/** Seuil de migration (SOL à lever sur la courbe) pour l'affichage. */
export function migrationThresholdSol(params: ConfigParameters): number {
  return Number(params.migrationQuoteThreshold.toString()) / 1e9;
}
