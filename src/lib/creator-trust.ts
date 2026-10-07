/** Confiance d'un créateur, d'après ce qu'il a fait de ses propres mèmes (pur, testé). */

export type CreatorTrade = { side: "buy" | "sell"; token_amount: number; block_time: string };
export type CreatorToken = { mint: string; created_at: string; migrated: boolean; trades: CreatorTrade[] };

/** Part (0–100) des tokens achetés par le créateur qu'il a revendus ; null s'il n'a rien acheté. */
export function soldPct(trades: Pick<CreatorTrade, "side" | "token_amount">[]): number | null {
  let bought = 0;
  let sold = 0;
  for (const t of trades) {
    if (t.side === "buy") bought += Number(t.token_amount);
    else sold += Number(t.token_amount);
  }
  if (bought <= 0) return null;
  return Math.min(100, (sold / bought) * 100);
}

/** Revente massive (≥ 50 % de ses tokens) dans les 24 h suivant le lancement. */
export function isEarlyDump(token: CreatorToken): boolean {
  const deadline = Date.parse(token.created_at) + 24 * 3_600_000;
  const early = token.trades.filter((t) => t.side === "buy" || Date.parse(t.block_time) <= deadline);
  return (soldPct(early) ?? 0) >= 50;
}

export type Trust = {
  niveau: "nouveau" | "fiable" | "mitige" | "risque";
  label: string;
  detail: string;
  tokens: number;
  migrated: number;
  earlyDumps: number;
};

export function creatorTrust(tokens: CreatorToken[]): Trust {
  const migrated = tokens.filter((t) => t.migrated).length;
  const earlyDumps = tokens.filter(isEarlyDump).length;
  const base = { tokens: tokens.length, migrated, earlyDumps };
  const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? "s" : ""}`;

  if (tokens.length === 0) return { ...base, niveau: "nouveau", label: "Nouveau créateur", detail: "Aucun mème lancé pour l'instant." };
  if (earlyDumps > 0 && earlyDumps / tokens.length >= 1 / 3) {
    return { ...base, niveau: "risque", label: "Revend vite", detail: `A revendu l'essentiel de ses tokens dans les 24 h sur ${plural(earlyDumps, "mème")}.` };
  }
  if (earlyDumps > 0) {
    return { ...base, niveau: "mitige", label: "Mitigé", detail: `Une revente rapide sur ${plural(tokens.length, "mème")} lancé${tokens.length > 1 ? "s" : ""}.` };
  }
  return {
    ...base,
    niveau: "fiable",
    label: "Fiable",
    detail: migrated > 0 ? `${plural(migrated, "mème")} a pris la Bastille, aucune revente rapide.` : `Aucune revente rapide sur ${plural(tokens.length, "mème")}.`,
  };
}
