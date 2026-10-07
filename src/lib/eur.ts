/** Formatage d'un montant en euros à partir d'un montant en SOL et du cours SOL/EUR. */
export function formatEur(sol: number, solEur: number, fictive: boolean): string {
  const eur = sol * solEur;
  const digits = eur !== 0 && Math.abs(eur) < 1 ? 2 : 0;
  const value = eur.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: Math.abs(eur) < 0.01 ? 4 : digits });
  return `≈ ${value} €${fictive ? " fictifs" : ""}`;
}
