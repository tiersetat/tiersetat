"use client";

import { useEffect, useState } from "react";
import { MarketRow, type MarketItem } from "./MarketRow";
import { useWatchlist } from "./useWatchlist";

/** Onglets du panneau (sous-ensemble compact de ceux de l'accueil). */
const TABS = [
  { key: "liste", label: "Favoris" },
  { key: "cryptos", label: "Cryptos" },
  { key: "tendances", label: "Tendances" },
  { key: "dexpaye", label: "DEX payé" },
  { key: "detenus", label: "Plus détenus" },
  { key: "migre", label: "Migré" },
  { key: "bonding", label: "Bonding" },
  { key: "tiers-etat", label: "Tiers-État" },
  { key: "bourse", label: "Actions" },
] as const;
type Key = (typeof TABS)[number]["key"];
const STORE = "te_panel_tokens_tab";

function Star() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-label="Favoris">
      <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
    </svg>
  );
}

/** Panneau « Tokens » : les listes du marché, consultables depuis n'importe quelle page. */
export function TokensPanel() {
  const [tab, setTab] = useState<Key>("tendances");
  const [items, setItems] = useState<MarketItem[] | null>(null);
  const { list } = useWatchlist();
  const favKey = list.join(",");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE) as Key | null;
      if (saved && TABS.some((t) => t.key === saved)) Promise.resolve().then(() => setTab(saved));
    } catch {
      /* stockage indisponible */
    }
  }, []);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const url = tab === "liste" ? (favKey ? `/api/marche?mints=${favKey}` : null) : `/api/listes?tri=${tab}`;
        if (!url) return !stop && setItems([]);
        const j = (await (await fetch(url)).json()) as { items: MarketItem[] };
        if (!stop) setItems(j.items.slice(0, 60));
      } catch {
        /* réseau indisponible : on garde la liste affichée */
      }
    };
    Promise.resolve().then(() => !stop && setItems(null));
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [tab, favKey]);

  const choose = (k: Key) => {
    setTab(k);
    try {
      localStorage.setItem(STORE, k);
    } catch {
      /* stockage indisponible */
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <h2 className="px-1 text-lg font-extrabold">Tokens</h2>
      <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => choose(t.key)} className={`chip shrink-0 px-3 py-1.5 text-xs ${tab === t.key ? "chip-active" : ""}`}>
            {t.key === "liste" ? <Star /> : t.label}
          </button>
        ))}
      </div>
      <div className="surface no-scrollbar min-h-0 flex-1 overflow-y-auto p-1">
        {items === null ? (
          <ul>
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="m-1 h-12 animate-pulse rounded-2xl bg-white/[0.05]" />
            ))}
          </ul>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{tab === "liste" ? "Touche l'étoile d'un token pour le suivre ici." : "Rien à afficher pour l'instant."}</p>
        ) : (
          <ul>
            {items.map((t) => (
              <MarketRow key={t.address} t={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
