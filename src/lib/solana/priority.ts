import { ComputeBudgetProgram, type Transaction } from "@solana/web3.js";

/** Niveaux de frais de priorité (prix par unité de calcul, en micro-lamports). */
export const PRIORITY_LEVELS = {
  normal: { label: "Normal", microLamports: 0 },
  rapide: { label: "Rapide", microLamports: 100_000 },
  turbo: { label: "Turbo", microLamports: 1_000_000 },
} as const;
export type PriorityLevel = keyof typeof PRIORITY_LEVELS;

/** Plafond d'unités de calcul : borne le coût maximal des frais de priorité. */
export const COMPUTE_UNIT_LIMIT = 400_000;

/** Coût maximal des frais de priorité pour un niveau donné, en SOL. */
export function maxPriorityFeeSol(level: PriorityLevel): number {
  return (PRIORITY_LEVELS[level].microLamports * COMPUTE_UNIT_LIMIT) / 1e6 / 1e9;
}

/**
 * Ajoute (en tête) les instructions de priorité à une transaction, sauf niveau normal
 * ou si la transaction en contient déjà (le SDK peut en ajouter lui-même).
 */
export function applyPriority(tx: Transaction, level: PriorityLevel): Transaction {
  const price = PRIORITY_LEVELS[level].microLamports;
  if (price === 0) return tx;
  if (tx.instructions.some((ix) => ix.programId.equals(ComputeBudgetProgram.programId))) return tx;
  tx.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price }),
  );
  return tx;
}
