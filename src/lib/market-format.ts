/** Formats compacts façon appli de trading : $1.04M, $0.00106, +31 325 %. */
export function usd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `$${(n / 1e3).toFixed(1)}K`;
  if (abs >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (abs === 0) return "$0";
  // petits prix : 3 chiffres significatifs
  return `$${n.toPrecision(3)}`;
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const v = Math.abs(n) >= 100 ? Math.round(n).toLocaleString("fr-FR") : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return `${n >= 0 ? "▲" : "▼"} ${v.replace("-", "")} %`;
}
