"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketRow, type MarketItem } from "./MarketRow";
import { useWatchlist } from "./useWatchlist";

/** « Ma liste » : les tokens suivis avec l'étoile, cours mis à jour toutes les 30 secondes. */
export function WatchlistView() {
  const { list } = useWatchlist();
  const [items, setItems] = useState<MarketItem[] | null>(null);
  const key = list.join(",");

  useEffect(() => {
    if (!key) return;
    let stop = false;
    const load = () =>
      fetch(`/api/marche?mints=${key}`)
        .then((r) => r.json())
        .then((j: { items: MarketItem[] }) => !stop && setItems(j.items))
        .catch(() => undefined);
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [key]);

  if (!key) {
    return (
      <div className="surface space-y-3 p-8 text-center">
        <svg viewBox="0 0 24 24" className="mx-auto size-10 text-white/70" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden>
          <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
        </svg>
        <p className="font-bold">Ta liste est vide</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">Touche l&apos;étoile sur la fiche d&apos;un token pour le suivre ici, avec son cours en direct.</p>
        <Link href="/?tri=solana#explorer" scroll={false} className="btn-ghost">
          Voir les tendances
        </Link>
      </div>
    );
  }
  return (
    <ul className="surface divide-y divide-ligne/60 p-1.5">
      {items === null
        ? list.map((a) => <li key={a} className="m-1 h-14 animate-pulse rounded-2xl bg-white/[0.04]" />)
        : items.map((t) => <MarketRow key={t.address} t={t} />)}
    </ul>
  );
}
