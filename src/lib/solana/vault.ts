/**
 * Coffre multi-signature de la trésorerie (Squads v4) : proposer, approuver et exécuter
 * l'encaissement des frais plateforme des mèmes dont le coffre est le bénéficiaire.
 * Utilisable dans le navigateur (panneau admin) comme dans les tests.
 */
import BN from "bn.js";
import * as multisig from "@sqds/multisig";
import { PublicKey, Transaction, TransactionMessage, type Connection, type TransactionInstruction } from "@solana/web3.js";
import { createCloseAccountInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { dbcClient } from "./dbc";

const U64_MAX = new BN("18446744073709551615");

export type VaultInfo = { multisig: PublicKey; vault: PublicKey; threshold: number; members: PublicKey[]; lastIndex: bigint; balanceSol: number };
export type ProposalInfo = { index: bigint; status: string; approvals: PublicKey[]; memo: string | null };

export function vaultOf(multisigPda: PublicKey): PublicKey {
  return multisig.getVaultPda({ multisigPda, index: 0 })[0];
}

export async function loadVault(connection: Connection, multisigPda: PublicKey): Promise<VaultInfo> {
  const ms = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPda);
  const vault = vaultOf(multisigPda);
  return {
    multisig: multisigPda,
    vault,
    threshold: ms.threshold,
    members: ms.members.map((m) => m.key),
    lastIndex: BigInt(ms.transactionIndex.toString()),
    balanceSol: (await connection.getBalance(vault)) / 1e9,
  };
}

/** Propositions récentes (de la plus récente à la plus ancienne). */
export async function loadProposals(connection: Connection, multisigPda: PublicKey, lastIndex: bigint, count = 10): Promise<ProposalInfo[]> {
  const out: ProposalInfo[] = [];
  for (let i = lastIndex; i > BigInt(0) && i > lastIndex - BigInt(count); i--) {
    const [pda] = multisig.getProposalPda({ multisigPda, transactionIndex: i });
    const p = await multisig.accounts.Proposal.fromAccountAddress(connection, pda).catch(() => null);
    if (p) out.push({ index: i, status: p.status.__kind, approvals: p.approved, memo: null });
  }
  return out;
}

/** Instructions d'encaissement (exécutées par le coffre) pour les pools dont il est bénéficiaire. */
async function claimInstructions(connection: Connection, vault: PublicKey, pools: string[]): Promise<TransactionInstruction[]> {
  const client = dbcClient(connection);
  const ixs: TransactionInstruction[] = [];
  for (const pool of pools) {
    const tx = await client.partner.claimPartnerTradingFee({ pool: new PublicKey(pool), feeClaimer: vault, payer: vault, maxBaseAmount: new BN(0), maxQuoteAmount: U64_MAX });
    ixs.push(...tx.instructions);
    // Le SDK ouvre au passage un compte (vide) pour le token du mème : on le referme pour récupérer son loyer
    const state = await client.state.getPool(pool);
    if (state) {
      const baseAta = getAssociatedTokenAddressSync(state.poolState.baseMint, vault, true, TOKEN_PROGRAM_ID);
      ixs.push(createCloseAccountInstruction(baseAta, vault, vault, [], TOKEN_PROGRAM_ID));
    }
  }
  return ixs;
}

/** Une transaction : crée l'opération du coffre, la proposition et la première approbation (celle du proposant). */
export async function buildClaimProposalTx(connection: Connection, member: PublicKey, multisigPda: PublicKey, pools: string[]): Promise<{ tx: Transaction; index: bigint }> {
  const info = await loadVault(connection, multisigPda);
  const index = info.lastIndex + BigInt(1);
  const transactionMessage = new TransactionMessage({
    payerKey: info.vault,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
    instructions: await claimInstructions(connection, info.vault, pools),
  });
  const tx = new Transaction().add(
    multisig.instructions.vaultTransactionCreate({
      multisigPda,
      transactionIndex: index,
      creator: member,
      vaultIndex: 0,
      ephemeralSigners: 0,
      transactionMessage,
      memo: `Encaissement des frais de ${pools.length} mème${pools.length > 1 ? "s" : ""}`,
    }),
    multisig.instructions.proposalCreate({ multisigPda, creator: member, transactionIndex: index }),
    multisig.instructions.proposalApprove({ multisigPda, transactionIndex: index, member }),
  );
  return { tx, index };
}

export function buildApproveTx(multisigPda: PublicKey, member: PublicKey, index: bigint): Transaction {
  return new Transaction().add(multisig.instructions.proposalApprove({ multisigPda, transactionIndex: index, member }));
}

export async function buildExecuteTx(connection: Connection, multisigPda: PublicKey, member: PublicKey, index: bigint): Promise<Transaction> {
  const { instruction } = await multisig.instructions.vaultTransactionExecute({ connection, multisigPda, transactionIndex: index, member });
  return new Transaction().add(instruction);
}
