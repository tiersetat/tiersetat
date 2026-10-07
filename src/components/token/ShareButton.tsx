"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/solana/config";

/** Partage d'un token : X (texte prérempli, l'image de partage est générée automatiquement) ou copie du lien. */
export function ShareButton({ name, ticker, path }: { name: string; ticker: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}${path}`;
  const text = `${name} ($${ticker}) vient d'être frappé sur Tiers-État, le launchpad des mèmes français 🇫🇷`;

  return (
    <>
      <a
        href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="chip text-lueur"
      >
        Partager sur X
      </a>
      <button
        type="button"
        className="chip"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* presse-papiers indisponible */
          }
        }}
      >
        {copied ? "Lien copié ✓" : "Copier le lien"}
      </button>
    </>
  );
}
