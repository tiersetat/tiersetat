import { describe, expect, it } from "vitest";
import { ComputeBudgetProgram, Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { applyPriority, maxPriorityFeeSol } from "@/lib/solana/priority";

const transfer = () =>
  new Transaction().add(SystemProgram.transfer({ fromPubkey: Keypair.generate().publicKey, toPubkey: Keypair.generate().publicKey, lamports: 1 }));

describe("frais de priorité", () => {
  it("n'ajoute rien en mode normal", () => {
    expect(applyPriority(transfer(), "normal").instructions).toHaveLength(1);
  });

  it("ajoute limite + prix en tête en mode turbo", () => {
    const tx = applyPriority(transfer(), "turbo");
    expect(tx.instructions).toHaveLength(3);
    expect(tx.instructions[0].programId.equals(ComputeBudgetProgram.programId)).toBe(true);
    expect(tx.instructions[1].programId.equals(ComputeBudgetProgram.programId)).toBe(true);
  });

  it("ne double pas des instructions déjà présentes", () => {
    const tx = applyPriority(applyPriority(transfer(), "rapide"), "turbo");
    expect(tx.instructions).toHaveLength(3);
  });

  it("reste bon marché : turbo coûte au plus 0,0004 SOL", () => {
    expect(maxPriorityFeeSol("turbo")).toBeCloseTo(0.0004);
    expect(maxPriorityFeeSol("rapide")).toBeCloseTo(0.00004);
  });
});
