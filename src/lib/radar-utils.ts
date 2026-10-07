/** Radar memecoins : formats et signaux d'alerte (pur, testé). */

export type RadarStats = {
  priceUsd: number | null;
  mcapUsd: number | null;
  liquidityUsd: number | null;
  volume24Usd: number | null;
  change: { m5: number | null; h1: number | null; h24: number | null };
  buys24: number | null;
  sells24: number | null;
  createdAt: number | null;
};

export type Alerte = { niveau: "danger" | "attention"; texte: string };

/** Signaux simples et vérifiables, affichés à côté de chaque fiche. */
export function alertes(s: RadarStats, now = Date.now()): Alerte[] {
  const out: Alerte[] = [];
  const ageH = s.createdAt ? (now - s.createdAt) / 3_600_000 : null;
  if (s.liquidityUsd !== null && s.liquidityUsd < 10_000) out.push({ niveau: "danger", texte: "Liquidité très faible : difficile de revendre" });
  else if (s.liquidityUsd !== null && s.liquidityUsd < 50_000) out.push({ niveau: "attention", texte: "Liquidité faible" });
  if (ageH !== null && ageH < 24) out.push({ niveau: "attention", texte: `Token créé il y a ${ageH < 1 ? "moins d'une heure" : `${Math.floor(ageH)} h`}` });
  // Ratio pertinent pour les petits tokens ; les gros ont leur liquidité répartie sur plusieurs marchés
  if (s.mcapUsd && s.liquidityUsd && s.mcapUsd < 50_000_000 && s.mcapUsd / s.liquidityUsd > 50) out.push({ niveau: "danger", texte: "Capitalisation très supérieure à la liquidité" });
  if (s.buys24 !== null && s.sells24 !== null && s.sells24 > s.buys24 * 1.5 && s.sells24 > 50) out.push({ niveau: "attention", texte: "Beaucoup plus de ventes que d'achats sur 24 h" });
  if (s.change.h24 !== null && s.change.h24 <= -50) out.push({ niveau: "danger", texte: `Chute de ${Math.round(-s.change.h24)} % en 24 h` });
  if (s.change.h24 !== null && s.change.h24 >= 500) out.push({ niveau: "attention", texte: "Hausse extrême : forte volatilité" });
  return out;
}

/** 1 234 567 → « 1,23 M $ » ; prix minuscules en notation lisible. */
export function usd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Md $`;
  if (abs >= 1e6) return `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M $`;
  if (abs >= 1e3) return `${(n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k $`;
  if (abs >= 1) return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} $`;
  return `${n.toLocaleString("fr-FR", { maximumSignificantDigits: 3 })} $`;
}

export function pct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("fr-FR", { maximumFractionDigits: Math.abs(n) < 10 ? 1 : 0 })} %`;
}

export function age(createdAt: number | null, now = Date.now()): string {
  if (!createdAt) return "—";
  const m = Math.max(0, Math.round((now - createdAt) / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d} j` : `${Math.floor(d / 30)} mois`;
}

/** Une adresse Solana (base58, 32 à 44 caractères) ? */
export const isSolanaAddress = (q: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q);

/** « $inu », « INU », « inu » → « INU » (recherche par ticker). */
export const normalizeTicker = (q: string) => q.trim().replace(/^\$/, "").toUpperCase();
