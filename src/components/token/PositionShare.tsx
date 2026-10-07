"use client";

import { useState } from "react";

/** Partage d'un récap de position : X (l'image du récap s'affiche automatiquement) ou copie du lien. */
export function PositionShare({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="btn-primary"
      >
        Partager sur X
      </a>
      <button
        type="button"
        className="btn-ghost"
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
    </div>
  );
}
