"use client";

import { useState } from "react";

/** Vignette d'actu servie par le média : chargement différé, repli sobre si l'image est absente ou bloquée. */
export function BuzzImage({ src, source, priority = false }: { src: string | null; source: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-indigo/40 via-surface to-nuit">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- images tierces déjà dimensionnées par les médias, sans passer par notre optimiseur
        <img
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center font-mono text-sm uppercase tracking-[0.3em] text-lueur/50">{source}</span>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
}
