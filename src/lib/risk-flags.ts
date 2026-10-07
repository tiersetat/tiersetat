/** Indicateurs de transparence d'un token (calcul pur, testé). */

export type RiskReport = {
  ageMinutes: number;
  /** Part de l'offre totale détenue par le créateur (0–100), null si inconnue */
  creatorPct: number | null;
  creatorSold: boolean;
  /** Part de l'offre détenue par les 10 plus gros portefeuilles hors courbe (0–100), null si inconnue */
  top10Pct: number | null;
  top10Source: "chain" | "trades" | null;
  /** SOL actuellement dans la bonding curve (null si non lu) */
  reserveSol: number | null;
  /** null = non vérifié (RPC indisponible) : on n'affiche alors rien plutôt qu'un badge non prouvé */
  mintRevoked: boolean | null;
  freezeRevoked: boolean | null;
};

export type RiskFlag = { level: "ok" | "warn" | "danger"; label: string; detail: string };

export const THRESHOLDS = {
  freshMinutes: 60,
  creatorWarnPct: 10,
  creatorDangerPct: 25,
  top10WarnPct: 40,
  top10DangerPct: 60,
  lowReserveSol: 0.5,
};

const pct = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

export function riskFlags(r: RiskReport): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (r.mintRevoked !== null) {
    flags.push(
      r.mintRevoked
        ? { level: "ok", label: "Mint immuable", detail: "Personne ne peut créer de nouveaux tokens." }
        : { level: "danger", label: "Mint actif", detail: "De nouveaux tokens peuvent encore être créés." },
    );
  }
  if (r.freezeRevoked === false) {
    flags.push({ level: "danger", label: "Gel possible", detail: "Une autorité peut bloquer des portefeuilles." });
  }
  if (r.freezeRevoked) flags.push({ level: "ok", label: "Pas de gel possible", detail: "Aucun portefeuille ne peut être bloqué." });
  flags.push({ level: "ok", label: "Liquidité non retirable", detail: "La liquidité est dans le pool, puis verrouillée à vie sur le DEX." });

  if (r.ageMinutes < THRESHOLDS.freshMinutes) {
    flags.push({ level: "warn", label: "Token très récent", detail: `Créé il y a ${Math.max(1, Math.round(r.ageMinutes))} min : le prix peut être très volatil.` });
  }

  if (r.creatorPct !== null) {
    const level = r.creatorPct >= THRESHOLDS.creatorDangerPct ? "danger" : r.creatorPct >= THRESHOLDS.creatorWarnPct ? "warn" : "ok";
    flags.push({ level, label: `Créateur : ${pct(r.creatorPct)} de l'offre`, detail: level === "ok" ? "Part du créateur modérée." : "Le créateur peut faire chuter le prix en vendant." });
  }
  if (r.creatorSold) flags.push({ level: "warn", label: "Le créateur a vendu", detail: "Le créateur a déjà revendu une partie de ses tokens." });

  if (r.top10Pct !== null) {
    const level = r.top10Pct >= THRESHOLDS.top10DangerPct ? "danger" : r.top10Pct >= THRESHOLDS.top10WarnPct ? "warn" : "ok";
    const source = r.top10Source === "trades" ? " (estimation d'après les échanges)" : "";
    flags.push({ level, label: `Top 10 : ${pct(r.top10Pct)} de l'offre`, detail: `Part des 10 plus gros portefeuilles hors courbe${source}.` });
  }

  if (r.reserveSol !== null && r.reserveSol < THRESHOLDS.lowReserveSol) {
    flags.push({ level: "warn", label: "Peu de liquidité", detail: `Seulement ${r.reserveSol.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} SOL dans la courbe : de petits ordres font beaucoup bouger le prix.` });
  }

  return flags;
}

/** Avertissements à rappeler juste avant un achat (niveau warn/danger uniquement). */
export function buyWarnings(flags: RiskFlag[]): string[] {
  return flags.filter((f) => f.level !== "ok").map((f) => f.label);
}
