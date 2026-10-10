import { describe, expect, it } from "vitest";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { buildSendTransaction, cashTotal, parseRecipient } from "@/lib/solana/cash";

describe("cash", () => {
  it("additionne USDC et EURC dans la monnaie d'affichage", () => {
    const b = { SOL: 1, USDC: 100, EURC: 50 };
    expect(cashTotal(b, "EUR", 0.9)).toBeCloseTo(140);
    expect(cashTotal(b, "USD", 0.9)).toBeCloseTo(100 + 50 / 0.9);
  });

  it("sans cours dollar/euro, n'affiche un total que s'il n'y a qu'une monnaie", () => {
    expect(cashTotal({ SOL: 0, USDC: 0, EURC: 20 }, "EUR", null)).toBe(20);
    expect(cashTotal({ SOL: 0, USDC: 5, EURC: 20 }, "EUR", null)).toBeNull();
  });

  it("refuse les adresses invalides ou hors courbe", () => {
    expect(parseRecipient("pas une adresse")).toBeNull();
    expect(parseRecipient(Keypair.generate().publicKey.toBase58())).not.toBeNull();
    // adresse dérivée d'un programme (hors de la courbe ed25519) : personne ne détient sa clé
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from("tiers")], SystemProgram.programId);
    expect(parseRecipient(pda.toBase58())).toBeNull();
  });

  it("construit un envoi de SOL et un envoi d'USDC avec création du compte destinataire", () => {
    const from = Keypair.generate().publicKey;
    const to = Keypair.generate().publicKey;
    const sol = buildSendTransaction(from, to, "SOL", 0.5);
    expect(sol.instructions).toHaveLength(1);
    expect(sol.instructions[0].programId.equals(SystemProgram.programId)).toBe(true);
    const usdc = buildSendTransaction(from, to, "USDC", 12.34);
    expect(usdc.instructions).toHaveLength(2);
    // 12,34 USDC = 12 340 000 unités (6 décimales), encodées dans l'instruction transferChecked
    expect(usdc.instructions[1].data.readBigUInt64LE(1)).toBe(BigInt(12_340_000));
  });
});
