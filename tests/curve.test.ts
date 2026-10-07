import { describe, expect, it } from "vitest";
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
