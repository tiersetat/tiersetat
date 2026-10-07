"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useState } from "react";
import { explorerUrl, FOUNDER_WALLET } from "@/lib/solana/config";

const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/** Figer les points des Cahiers sur IPFS puis sceller leur empreinte sur la blockchain (signature du fondateur). */
export function SnapshotPanel() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ signature: string; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isFounder = Boolean(publicKey && FOUNDER_WALLET && publicKey.equals(FOUNDER_WALLET));

  async function seal() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cahiers-snapshot", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Préparation impossible.");
      const tx = new Transaction().add(
        new TransactionInstruction({ programId: MEMO_PROGRAM, keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }], data: new TextEncoder().encode(json.memo) as unknown as Buffer }),
      );
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = publicKey;
      tx.recentBlockhash = latest.blockhash;
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature, ...latest }, "confirmed");
      setResult({ signature, count: json.count });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|refus|declin/i.test(msg) ? "Signature refusée dans le wallet." : msg.slice(0, 160));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-3 p-5">
      <h2 className="font-semibold">Preuve des points</h2>
      <p className="text-xs text-muted-foreground">
        Fige le classement complet des Cahiers sur IPFS et inscrit son empreinte sur la blockchain. À faire chaque semaine.
      </p>
      {isFounder ? (
        <button type="button" className="btn-primary w-full text-sm" disabled={busy} onClick={() => void seal()}>
          {busy ? "Scellement…" : "Sceller l'instantané des points"}
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">Connecte le wallet fondateur pour sceller.</p>
      )}
      {result && (
        <p className="text-xs text-achat">
          Scellé ✓ {result.count} comptes ·{" "}
          <a href={explorerUrl("tx", result.signature)} target="_blank" rel="noreferrer" className="underline">
            voir la transaction
          </a>
        </p>
      )}
      {error && <p className="text-xs text-vente">{error}</p>}
    </section>
  );
}
