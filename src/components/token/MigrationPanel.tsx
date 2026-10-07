"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { explorerUrl } from "@/lib/solana/config";
import { postMigrationLinks } from "@/lib/solana/migration";

/**
 * Courbe remplie : n'importe quel visiteur peut lancer la migration vers le DEX.
 * Token migré : liens pour continuer à l'échanger.
 */
export function MigrationPanel({ mint, pool, migrated, onDone }: { mint: string; pool: string; migrated: boolean; onDone: () => void }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sig, setSig] = useState<string | null>(null);

  if (migrated) {
    return (
      <div className="surface space-y-3 p-5 text-sm">
        <p className="font-semibold text-achat">🎉 Ce token est sur le DEX</p>
        <p className="text-muted-foreground">La courbe est remplie : la liquidité est maintenant dans un pool Meteora DAMM v2, verrouillée à vie.</p>
        <div className="flex flex-wrap gap-2">
          {postMigrationLinks(mint).map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2 text-xs">
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>
    );
  }

  async function migrate() {
    if (!publicKey) return setVisible(true);
    setBusy(true);
    setError(null);
    try {
      const { buildMigrationTx } = await import("@/lib/solana/migration");
      const { tx, signers } = await buildMigrationTx(connection, publicKey, pool);
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = publicKey;
      tx.recentBlockhash = latest.blockhash;
      const signature = await sendTransaction(tx, connection, { signers });
      await connection.confirmTransaction({ signature, ...latest }, "confirmed");
      setSig(signature);
      // Met à jour l'état « migré » côté site (la transaction est relue on-chain)
      await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signature, mint }) }).catch(() => undefined);
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|refus|declin/i.test(msg) ? "Transaction refusée dans le wallet." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface space-y-3 border-achat/40 p-5 text-sm">
      <p className="font-semibold text-achat">🏁 La courbe est remplie !</p>
      <p className="text-muted-foreground">
        Les achats et ventes sur la courbe sont terminés. Il reste une étape : créer le pool sur le DEX. N&apos;importe qui peut la lancer (quelques centimes de frais réseau).
      </p>
      <button type="button" className="btn-primary w-full" onClick={() => void migrate()} disabled={busy}>
        {!publicKey ? "Connecter un wallet" : busy ? "Migration en cours…" : "Lancer la migration vers le DEX"}
      </button>
      {error && <p className="break-all text-vente">{error}</p>}
      {sig && (
        <a href={explorerUrl("tx", sig)} target="_blank" rel="noreferrer" className="block text-xs text-achat hover:underline">
          ✓ Migration effectuée · voir la transaction ↗
        </a>
      )}
    </div>
  );
}
