import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, type Connection } from "@solana/web3.js";
import { CLUSTER } from "./config";

/**
 * Le « Cash » du portefeuille : des stablecoins de Circle, qui valent toujours 1 $ (USDC) ou 1 € (EURC).
 * Les fonds restent dans le wallet de l'utilisateur : Tiers-État n'y a jamais accès.
 */
export type CashSymbol = "USDC" | "EURC";
export type AssetSymbol = CashSymbol | "SOL";

const DEVNET = (CLUSTER as string) === "devnet";

export const CASH: Record<CashSymbol, { label: string; sign: string; mint: PublicKey; decimals: number }> = {
  USDC: {
    label: "Dollar",
    sign: "$",
    // Adresses officielles de Circle (réseau de test / réseau principal)
    mint: new PublicKey(DEVNET ? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    decimals: 6,
  },
  EURC: {
    label: "Euro",
    sign: "€",
    mint: new PublicKey("HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr"),
    decimals: 6,
  },
};

/** SOL gardés de côté pour payer les frais du réseau quand on envoie « le maximum ». */
export const SOL_FEE_RESERVE = 0.01;

export type Balances = Record<AssetSymbol, number>;

/** Soldes SOL, USDC et EURC d'un wallet, lus sur la blockchain. */
export async function getBalances(connection: Connection, owner: PublicKey): Promise<Balances> {
  const [lamports, usdc, eurc] = await Promise.all([
    connection.getBalance(owner),
    tokenBalance(connection, owner, CASH.USDC.mint),
    tokenBalance(connection, owner, CASH.EURC.mint),
  ]);
  return { SOL: lamports / LAMPORTS_PER_SOL, USDC: usdc, EURC: eurc };
}

async function tokenBalance(connection: Connection, owner: PublicKey, mint: PublicKey): Promise<number> {
  const res = await connection.getParsedTokenAccountsByOwner(owner, { mint });
  return res.value.reduce((sum, a) => sum + Number(a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
}

/** Adresse Solana valide (wallet ordinaire, pas une adresse de programme). */
export function parseRecipient(value: string): PublicKey | null {
  try {
    const key = new PublicKey(value.trim());
    return PublicKey.isOnCurve(key.toBytes()) ? key : null;
  } catch {
    return null;
  }
}

/** Transaction d'envoi de SOL, USDC ou EURC (crée le compte du destinataire si besoin, à la charge de l'expéditeur). */
export function buildSendTransaction(from: PublicKey, to: PublicKey, asset: AssetSymbol, amount: number): Transaction {
  const tx = new Transaction();
  if (asset === "SOL") {
    tx.add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: Math.round(amount * LAMPORTS_PER_SOL) }));
    return tx;
  }
  const { mint, decimals } = CASH[asset];
  const source = getAssociatedTokenAddressSync(mint, from);
  const destination = getAssociatedTokenAddressSync(mint, to);
  const units = BigInt(Math.round(amount * 10 ** decimals));
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(from, destination, to, mint),
    createTransferCheckedInstruction(source, mint, destination, from, units, decimals),
  );
  return tx;
}

/** Valeur du cash dans la monnaie d'affichage choisie (usdEur = valeur d'un dollar en euros). */
export function cashTotal(b: Balances, display: "EUR" | "USD", usdEur: number | null): number | null {
  if (usdEur === null) return display === "EUR" ? (b.USDC === 0 ? b.EURC : null) : b.EURC === 0 ? b.USDC : null;
  return display === "EUR" ? b.EURC + b.USDC * usdEur : b.USDC + b.EURC / usdEur;
}
