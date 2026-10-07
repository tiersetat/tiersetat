"use client";

import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CLUSTER } from "@/lib/solana/config";

/** Adresse du wallet connecté + copie en un clic + solde : pour remplir le faucet sans chercher. */
export function MyAddress() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((l) => !cancelled && setBalance(l / LAMPORTS_PER_SOL))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  if (!publicKey) {
    return (
      <button type="button" className="btn-primary" onClick={() => setVisible(true)}>
        Connecter un wallet
      </button>
    );
  }

  const address = publicKey.toBase58();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-lg border border-ligne bg-black/30 px-3 py-2 font-mono text-xs break-all">{address}</code>
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* presse-papiers indisponible */
            }
          }}
        >
          {copied ? "Copiée ✓" : "Copier mon adresse"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Solde : <span className="font-mono text-foreground">{balance === null ? "…" : `${balance.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} SOL`}</span>
        {CLUSTER === "devnet" && " (fictifs)"}
      </p>
    </div>
  );
}
