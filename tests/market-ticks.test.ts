import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import { base58, decodePumpCurve, decodePumpSwapPool, VaultPairer } from "@/lib/solana/market-ticks";

describe("courbe pump.fun", () => {
  it("lit le prix (réserves virtuelles), les SOL réels et la fin de courbe", () => {
    const b = new Uint8Array(166);
    const v = new DataView(b.buffer);
    v.setBigUint64(8, BigInt(5.019e14), true); // tokens virtuels (6 décimales)
    v.setBigUint64(16, BigInt(6.414e10), true); // SOL virtuels (lamports)
    v.setBigUint64(32, BigInt(3.414e10), true); // SOL réels
    const c = decodePumpCurve(b)!;
    expect(c.priceSol).toBeCloseTo(64.14 / 501_900_000, 15);
    expect(c.realSol).toBeCloseTo(34.14, 6);
    expect(c.complete).toBe(false);
    b[48] = 1;
    expect(decodePumpCurve(b)!.complete).toBe(true);
  });
  it("refuse un compte trop court ou vide", () => {
    expect(decodePumpCurve(new Uint8Array(10))).toBeNull();
    expect(decodePumpCurve(new Uint8Array(80))).toBeNull();
  });
});

describe("pool PumpSwap", () => {
  it("trouve les coffres aux bons emplacements", () => {
    const b = new Uint8Array(301);
    b.fill(7, 139, 171);
    b.fill(9, 171, 203);
    const p = decodePumpSwapPool(b)!;
    expect([...p.baseVault].every((x) => x === 7)).toBe(true);
    expect([...p.quoteVault].every((x) => x === 9)).toBe(true);
  });
});

describe("base58", () => {
  it("encode une clé comme web3.js", () => {
    for (let i = 0; i < 20; i++) {
      const k = Keypair.generate().publicKey;
      expect(base58(k.toBytes())).toBe(k.toBase58());
    }
  });
});

describe("variations des coffres → prix payé", () => {
  it("reconstitue un achat puis une vente (sens opposés, même bloc)", () => {
    const p = new VaultPairer();
    p.seed(1_000_000, 100);
    expect(p.feed("base", 10, 999_000)).toBeNull(); // le coffre de SOL n'est pas encore arrivé
    const buy = p.feed("quote", 10, 100.0456)!;
    expect(buy.priceSol).toBeCloseTo(0.0456 / 1000, 10);
    expect(buy.volumeSol).toBeCloseTo(0.0456, 10);
    const sell = p.feed("quote", 11, 100.0228);
    expect(sell).toBeNull();
    expect(p.feed("base", 11, 999_500)!.priceSol).toBeCloseTo(0.0228 / 500, 10);
  });
  it("ignore un ajout de liquidité (les deux coffres montent)", () => {
    const p = new VaultPairer();
    p.seed(1000, 10);
    p.feed("base", 5, 1100);
    expect(p.feed("quote", 5, 11)).toBeNull();
  });
  it("écarte un prix aberrant (échanges croisés dans un même bloc)", () => {
    const p = new VaultPairer();
    p.seed(1000, 10);
    p.feed("base", 1, 990);
    expect(p.feed("quote", 1, 10.1)!.priceSol).toBeCloseTo(0.01, 10);
    p.feed("base", 2, 989.999);
    expect(p.feed("quote", 2, 9.9)).toBeNull(); // 0,2 SOL pour 0,001 token : rejeté
  });
  it("sans montants de départ, attend la deuxième variation de chaque coffre", () => {
    const p = new VaultPairer();
    expect(p.feed("base", 1, 1000)).toBeNull();
    expect(p.feed("quote", 1, 10)).toBeNull();
    p.feed("base", 2, 990);
    expect(p.feed("quote", 2, 10.1)!.priceSol).toBeCloseTo(0.01, 10);
  });
});
