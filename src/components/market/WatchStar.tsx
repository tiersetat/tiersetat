"use client";

import { useWatchlist } from "./useWatchlist";

/** Étoile : ajouter ou retirer un token de « Ma liste ». */
export function WatchStar({ address, className = "" }: { address: string; className?: string }) {
  const { has, toggle } = useWatchlist();
  const on = has(address);
  return (
    <button
      type="button"
      onClick={() => toggle(address)}
      aria-pressed={on}
      aria-label={on ? "Retirer de ma liste" : "Ajouter à ma liste"}
      className={`grid size-11 place-items-center rounded-full border transition active:scale-90 ${on ? "border-soleil bg-soleil text-nuit" : "border-white/15 bg-white/[0.06] text-foreground hover:border-white/30"} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden>
        <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
      </svg>
    </button>
  );
}
