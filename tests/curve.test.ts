import { describe, expect, it } from "vitest";
import { BaseFeeMode, calculateFeeSchedulerEndingBaseFeeBps } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { validateConfigParameters } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { buildPlatformCurve, migrationThresholdSol, PLATFORM_CURVE } from "@/lib/solana/curve";
import { buildCreateConfigTx } from "@/lib/solana/dbc";
import { DBC_PROGRAM_ID } from "@/lib/solana/config";

describe("courbe de la plateforme", () => {
  const params = buildPlatformCurve();

  it("passe la validation officielle du SDK Meteora", () => {
    expect(() =>
      validateConfigParameters({ ...params, leftoverReceiver: Keypair.generate().publicKey }),
    ).not.toThrow();
  });

  it("migre après une levée atteignable sur le devnet (entre 2 et 10 SOL)", () => {
    const sol = migrationThresholdSol(params);
    expect(sol).toBeGreaterThan(2);
    expect(sol).toBeLessThan(10);
  });

  it("encaisse les frais en SOL et reverse une part au créateur", () => {
    expect(params.collectFeeMode).toBe(0);
    expect(params.creatorTradingFeePercentage).toBe(PLATFORM_CURVE.creatorTradingFeePercentage);
  });

  it("anti-robots : 50 % au départ, 1 % au bout de 60 s", () => {
    const fee = params.poolFees.baseFee;
    expect(fee.baseFeeMode).toBe(BaseFeeMode.FeeSchedulerExponential);
    expect(Number(fee.cliffFeeNumerator.toString()) / 1e7).toBe(50);
    expect(fee.firstFactor).toBe(PLATFORM_CURVE.antiBot.durationSec);
    const endingBps = calculateFeeSchedulerEndingBaseFeeBps(
      Number(fee.cliffFeeNumerator.toString()),
      fee.firstFactor,
      Number(fee.secondFactor.toString()),
      Number(fee.thirdFactor.toString()),
      fee.baseFeeMode,
    );
    expect(Math.round(endingBps)).toBe(PLATFORM_CURVE.tradingFeeBps);
  });
});

describe("transaction de création de config", () => {
  it("cible le programme DBC et envoie les frais à la trésorerie", async () => {
    const connection = new Connection("https://api.devnet.solana.com");
    const payer = Keypair.generate().publicKey;
    const treasury = Keypair.generate().publicKey;
    const { tx, configKeypair } = await buildCreateConfigTx(connection, payer, treasury);
    const ix = tx.instructions.find((i) => i.programId.equals(DBC_PROGRAM_ID));
    expect(ix).toBeDefined();
    const keys = ix!.keys.map((k) => k.pubkey.toBase58());
    expect(keys).toContain(configKeypair.publicKey.toBase58());
    expect(keys).toContain(treasury.toBase58());
    expect(ix!.keys.find((k) => k.pubkey.equals(configKeypair.publicKey))?.isSigner).toBe(true);
    expect(PublicKey.isOnCurve(configKeypair.publicKey.toBytes())).toBe(true);
  });
});

describe("réglage du lancement réel", () => {
  it("donne le seuil inscrit et reste au-dessus des 10 SOL de la migration automatique", async () => {
    const { CURVE_PRESETS, PLATFORM_CURVE } = await import("@/lib/solana/platform");
    const { buildPlatformCurve } = await import("@/lib/solana/curve");
    const saved = { ...PLATFORM_CURVE };
    const mutable = PLATFORM_CURVE as { initialMarketCapSol: number; migrationMarketCapSol: number };
    mutable.initialMarketCapSol = CURVE_PRESETS.mainnet.initialMarketCapSol;
    mutable.migrationMarketCapSol = CURVE_PRESETS.mainnet.migrationMarketCapSol;
    try {
      const threshold = buildPlatformCurve().migrationQuoteThreshold.toString();
      expect(threshold).toBe(CURVE_PRESETS.mainnet.thresholdLamports);
      expect(Number(threshold) / 1e9).toBeGreaterThanOrEqual(10);
    } finally {
      mutable.initialMarketCapSol = saved.initialMarketCapSol;
      mutable.migrationMarketCapSol = saved.migrationMarketCapSol;
    }
  });
});
