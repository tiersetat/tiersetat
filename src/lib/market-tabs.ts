import type { Category } from "@/lib/hyperliquid";

/** Onglets de la liste : tout le marché (multi-blockchains), puis nos mèmes (launchpad). */
export const TABS = [
  { key: "liste", label: "Favoris" },
  { key: "cryptos", label: "Cryptos" },
  { key: "tendances", label: "Tendances" },
  { key: "dexpaye", label: "DEX payé" },
  { key: "detenus", label: "Plus détenus" },
  { key: "migre", label: "Migré" },
  { key: "bonding", label: "Bonding" },
  { key: "nouveaux", label: "Nouveaux" },
  { key: "tiers-etat", label: "Tiers-État" },
  { key: "bourse", label: "Actions" },
] as const;
export type Key = (typeof TABS)[number]["key"];
/** Catégories des marchés Hyperliquid */
export const CATS: { key: Category; label: string }[] = [
  { key: "actions", label: "Actions" },
  { key: "indices", label: "Indices · ETF" },
  { key: "matieres", label: "Matières premières" },
  { key: "pre-ipo", label: "Pré-IPO" },
  { key: "devises", label: "Forex" },
  { key: "taux", label: "Taux" },
];
export const parseKey = (v: unknown): Key => (TABS.some((t) => t.key === v) ? (v as Key) : "tendances");

