import { describe, expect, it } from "vitest";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";

/**
 * Simule (sans rien écrire on-chain) la transaction de lancement complète
 * avec la vraie config DBC de la plateforme. Payeur : le wallet trésorerie (qui a du SOL devnet).
 */
describe("lancement d'un mème (simulation devnet)", () => {
  it("crée le token + le pool + le premier achat sans erreur", async () => {
    const { DBC_CONFIG, RPC_URL, FOUNDER_WALLET } = await import("@/lib/solana/config");
    const { buildLaunchTx } = await import("@/lib/solana/launch");
    expect(DBC_CONFIG, "NEXT_PUBLIC_DBC_CONFIG").not.toBeNull();
    expect(FOUNDER_WALLET, "NEXT_PUBLIC_FOUNDER_WALLET").not.toBeNull();

    const connection = new Connection(RPC_URL, "confirmed");
    const creator = FOUNDER_WALLET as PublicKey;
    const { tx, mintKeypair } = await buildLaunchTx(connection, {
      creator,
      name: "Test Simulation",
      symbol: "SIMU",
      uri: "https://example.com/meta.json",
      firstBuySol: 0.1,
    });
    tx.feePayer = creator;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const sim = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), {
      sigVerify: false,
      replaceRecentBlockhash: true,
    });
    const logs = sim.value.logs ?? [];
    if (sim.value.err) console.log(logs.slice(-15).join("\n"));
    expect(sim.value.err).toBeNull();
    expect(logs.some((l) => l.includes("Instruction: InitializeVirtualPoolWithSplToken"))).toBe(true);
    expect(logs.some((l) => l.includes("Instruction: Swap"))).toBe(true);

    const pool = deriveDbcPoolAddress(NATIVE_MINT, mintKeypair.publicKey, DBC_CONFIG as PublicKey);
    expect(pool).toBeInstanceOf(PublicKey);
    console.log("mint simulé :", mintKeypair.publicKey.toBase58());
  });
});

describe("décodage manuel des pools (sans SDK)", () => {
  it("donne les mêmes valeurs que le SDK sur un vrai pool, et le bon seuil de migration", async () => {
    const { DBC_CONFIG, RPC_URL } = await import("@/lib/solana/config");
    const { dbcClient } = await import("@/lib/solana/dbc");
    const { decodePoolAccount, computePoolStats } = await import("@/lib/solana/pool-stats");
    const { MIGRATION_QUOTE_THRESHOLD_LAMPORTS } = await import("@/lib/solana/platform");
    const { buildPlatformCurve } = await import("@/lib/solana/curve");
    const connection = new Connection(RPC_URL, "confirmed");
    const client = dbcClient(connection);

    expect(buildPlatformCurve().migrationQuoteThreshold.toString()).toBe(MIGRATION_QUOTE_THRESHOLD_LAMPORTS.toString());
    const config = await client.state.getPoolConfig(DBC_CONFIG as PublicKey);
    expect(config?.migrationQuoteThreshold.toString()).toBe(MIGRATION_QUOTE_THRESHOLD_LAMPORTS.toString());

    // Pool de référence : $TIERS (ancienne config, toujours reconnue par la plateforme)
    const publicKey = new PublicKey("FyFeVD9k4wSosszWf6CfGVShmc7MTjKreG4UPHVbQbR1");
    const account = (await client.state.getPool(publicKey))!;
    const raw = await connection.getAccountInfo(publicKey);
    const manual = decodePoolAccount(raw!.data);
    const sdk = account.poolState;
    expect(manual.config.equals(sdk.config)).toBe(true);
    expect(manual.creator.equals(sdk.creator)).toBe(true);
    expect(manual.baseMint.equals(sdk.baseMint)).toBe(true);
    expect(manual.baseVault.equals(sdk.baseVault)).toBe(true);
    expect(manual.quoteVault.equals(sdk.quoteVault)).toBe(true);
    expect(manual.quoteReserve.toString()).toBe(sdk.quoteReserve.toString());
    expect(manual.sqrtPrice.toString()).toBe(sdk.sqrtPrice.toString());
    expect(manual.isMigrated).toBe(sdk.isMigrated === 1);
    expect(computePoolStats(manual, MIGRATION_QUOTE_THRESHOLD_LAMPORTS)).toEqual(
      computePoolStats(sdk, config!.migrationQuoteThreshold),
    );
  });
});

describe("lecture d'un trade depuis une vraie transaction", () => {
  it("retrouve le premier achat de $TIERS (0,1 SOL) dans la transaction de lancement", async () => {
    const { RPC_URL } = await import("@/lib/solana/config");
    const { parseTrade, waitForTransaction } = await import("@/lib/trades");
    const { decodePoolAccount } = await import("@/lib/solana/pool-stats");
    const connection = new Connection(RPC_URL, "confirmed");
    const mint = "CzboH6ohdFiumMSMLDj6S7makAFUcWMktrNbZTt6XbFR";
    const pool = decodePoolAccount((await connection.getAccountInfo(new PublicKey("FyFeVD9k4wSosszWf6CfGVShmc7MTjKreG4UPHVbQbR1")))!.data);
    const tx = await waitForTransaction(connection, "323BHSJfftZv6xxzpuCG2Z5X2mgVoV2pNrfDYukMMgKoxafSp6LxWtRRdQWCrAfxPmDjTeYoU8wVMUmj5pQu4eqZ");
    const trade = parseTrade(tx!, mint, { base: pool.baseVault.toBase58(), quote: pool.quoteVault.toBase58() });
    expect(trade).toMatchObject({ trader: "3ujUWs8CBCAszwQpXuFq5ULcMCYs4VjGQm6vtGgkcfro", side: "buy", solAmount: 0.1 });
    expect(trade!.tokenAmount).toBeCloseTo(47_388_821.433682, 3);
  });
});

describe("achat / vente sur la courbe (simulation devnet)", () => {
  for (const side of ["buy", "sell"] as const) {
    it(`simule un ${side === "buy" ? "achat de 0,05 SOL" : "vente de 1 000 000 $TIERS"} sans erreur`, async () => {
      const BN = (await import("bn.js")).default;
      const { RPC_URL, FOUNDER_WALLET } = await import("@/lib/solana/config");
      const { loadPoolSnapshot, quote, buildSwapTx } = await import("@/lib/solana/swap");
      const connection = new Connection(RPC_URL, "confirmed");
      const pool = "FyFeVD9k4wSosszWf6CfGVShmc7MTjKreG4UPHVbQbR1";
      const owner = FOUNDER_WALLET as PublicKey; // détient du SOL et des $TIERS sur le devnet
      const amountIn = side === "buy" ? new BN(50_000_000) : new BN("1000000000000");
      const snap = await loadPoolSnapshot(connection, pool);
      const q = quote(connection, snap, side, amountIn, 100);
      expect(Number(q.outputAmount.toString())).toBeGreaterThan(0);
      const { applyPriority } = await import("@/lib/solana/priority");
      // Achat testé avec les frais de priorité « turbo » (instructions ComputeBudget en tête)
      const tx = applyPriority(await buildSwapTx(connection, { owner, pool, side, amountIn, minimumAmountOut: q.minimumAmountOut }), side === "buy" ? "turbo" : "normal");
      tx.feePayer = owner;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const sim = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true });
      if (sim.value.err) console.log((sim.value.logs ?? []).slice(-12).join("\n"));
      expect(sim.value.err).toBeNull();
    });
  }
});
