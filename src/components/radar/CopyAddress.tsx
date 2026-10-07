"use client";

import { useState } from "react";

/** Adresse raccourcie + copie en un clic (l'info que tout le monde se partage sur X et Discord). */
export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copier l'adresse du token"
      className="rounded-lg border border-ligne bg-white/[0.03] px-2 py-1 font-mono text-xs text-muted-foreground hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* presse-papiers indisponible */
        }
      }}
    >
      {copied ? "Copiée ✓" : `${address.slice(0, 4)}…${address.slice(-4)} ⧉`}
    </button>
  );
}
