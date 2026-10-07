"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { explorerUrl, TREASURY_WALLET } from "@/lib/solana/config";
import type { ProposalInfo, VaultInfo } from "@/lib/solana/vault";

export type VaultToken = { mint: string; name: string; ticker: string; pool: string };

const MULTISIG = process.env.NEXT_PUBLIC_TREASURY_MULTISIG ? new PublicKey(process.env.NEXT_PUBLIC_TREASURY_MULTISIG) : null;
const STATUT: Record<string, string> = { Draft: "Brouillon", Active: "En attente", Approved: "Approuvée", Executed: "Exécutée", Rejected: "Rejetée", Cancelled: "Annulée" };
const sol = (lamports: bigint | number) => (Number(lamports) / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 6 });

/** Coffre de la trésorerie : encaisser les frais avec 2 signatures sur 3 (proposer, approuver, exécuter). */
export function VaultPanel({ tokens }: { tokens: VaultToken[] }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [proposals, setProposals] = useState<ProposalInfo[]>([]);
  const [pending, setPending] = useState<{ pool: string; lamports: bigint }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!MULTISIG || !TREASURY_WALLET) return;
    const [{ loadVault, loadProposals }, { loadRevenues }] = await Promise.all([import("@/lib/solana/vault"), import("@/lib/solana/claims")]);
    const info = await loadVault(connection, MULTISIG);
    setVault(info);
    setProposals(await loadProposals(connection, MULTISIG, info.lastIndex));
    const revenues = tokens.length ? await loadRevenues(connection, tokens.map((t) => t.pool), info.vault) : [];
    setPending(revenues.filter((r) => r.tradingLamports > BigInt(0)).map((r) => ({ pool: r.pool, lamports: r.tradingLamports })));
  }, [connection, tokens]);

  useEffect(() => {
    Promise.resolve().then(() => refresh().catch(() => setMessage("Lecture du coffre impossible pour le moment.")));
  }, [refresh]);

  const isMember = Boolean(publicKey && vault?.members.some((m) => m.equals(publicKey)));
  const total = pending.reduce((s, p) => s + p.lamports, BigInt(0));

  async function run(label: string, build: () => Promise<import("@solana/web3.js").Transaction>) {
    if (!publicKey) return;
    setBusy(true);
    setMessage(null);
    try {
      const tx = await build();
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = publicKey;
      tx.recentBlockhash = latest.blockhash;
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
      setMessage(`${label} ✓`);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessage(/reject|refus|declin/i.test(msg) ? "Transaction refusée dans le wallet." : `Échec : ${msg.slice(0, 160)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!MULTISIG) return null;
  return (
    <section className="surface space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Coffre de la trésorerie</h2>
        {vault && (
          <p className="text-xs text-muted-foreground">
            {vault.threshold} signatures sur {vault.members.length} ·{" "}
            <a href={explorerUrl("address", vault.vault.toBase58())} target="_blank" rel="noreferrer" className="font-mono underline">
              {vault.vault.toBase58().slice(0, 4)}…{vault.vault.toBase58().slice(-4)}
            </a>{" "}
            · solde {vault.balanceSol.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} SOL
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          Frais à encaisser : <span className="font-mono font-medium text-achat">{sol(total)} SOL</span>
          <span className="text-muted-foreground"> · {pending.length} mème{pending.length > 1 ? "s" : ""}</span>
        </p>
        {!isMember ? (
          <p className="text-xs text-muted-foreground">Connecte un wallet membre du coffre pour proposer ou approuver.</p>
        ) : (
          <button
            type="button"
            className="btn-primary w-full text-sm"
            disabled={busy || pending.length === 0}
            onClick={() =>
              run("Proposition créée (1re signature)", async () => {
                const { buildClaimProposalTx } = await import("@/lib/solana/vault");
                return (await buildClaimProposalTx(connection, publicKey!, MULTISIG, pending.slice(0, 5).map((p) => p.pool))).tx;
              })
            }
          >
            Proposer l&apos;encaissement
          </button>
        )}
      </div>

      {proposals.length > 0 && (
        <ul className="divide-y divide-ligne text-sm">
          {proposals.map((p) => {
            const approved = Boolean(publicKey && p.approvals.some((a) => a.equals(publicKey)));
            return (
              <li key={p.index.toString()} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  Proposition n°{p.index.toString()} ·{" "}
                  <span className={p.status === "Executed" ? "text-achat" : "text-muted-foreground"}>{STATUT[p.status] ?? p.status}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {p.approvals.length}/{vault?.threshold} signatures
                  </span>
                </span>
                {isMember && p.status === "Active" && !approved && (
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1 text-xs"
                    disabled={busy}
                    onClick={() =>
                      run("Approbation enregistrée", async () => (await import("@/lib/solana/vault")).buildApproveTx(MULTISIG, publicKey!, p.index))
                    }
                  >
                    Approuver
                  </button>
                )}
                {isMember && p.status === "Approved" && (
                  <button
                    type="button"
                    className="btn-primary px-3 py-1 text-xs"
                    disabled={busy}
                    onClick={() =>
                      run("Encaissement exécuté", async () => (await import("@/lib/solana/vault")).buildExecuteTx(connection, MULTISIG, publicKey!, p.index))
                    }
                  >
                    Exécuter
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <p className="text-[11px] text-muted-foreground/80">
        Chaque encaissement est proposé par un membre, approuvé par un second, puis exécuté. Les frais arrivent dans le coffre, jamais sur un
        wallet personnel.
      </p>
    </section>
  );
}
