/** Mini-courbe de prix (SVG pur, sans bibliothèque) : verte si le prix monte sur la période, rouge sinon. */
export function Sparkline({ points, className = "h-10 w-full" }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const W = 120;
  const H = 36;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * W, H - 2 - ((p - min) / span) * (H - 4)]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const up = points.at(-1)! >= points[0];
  const color = up ? "var(--achat)" : "var(--vente)";
  const id = `spark-${up ? "u" : "d"}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
