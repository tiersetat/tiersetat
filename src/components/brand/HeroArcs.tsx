/**
 * Décor de fête de l'accueil : confettis et serpentins aux couleurs Tiers-État.
 * Pur SVG + CSS (aucun JavaScript). Seuls quelques confettis flottent, en `transform` uniquement,
 * et tout s'arrête si l'utilisateur réduit les animations.
 */
const C = { roi: "#3d5afe", cerise: "#ff3d68", soleil: "#ffd23f", bonbon: "#ff7ad9", menthe: "#3dffb0", ciel: "#5ec8ff" };

type Piece = { x: number; y: number; r: number; c: string; k: "rect" | "dot" | "tri"; f?: 1 | 2 | 3 };
const PIECES: Piece[] = [
  { x: 6, y: 18, r: -20, c: C.soleil, k: "rect", f: 1 },
  { x: 14, y: 62, r: 30, c: C.cerise, k: "tri", f: 2 },
  { x: 22, y: 30, r: 10, c: C.menthe, k: "dot" },
  { x: 9, y: 82, r: 45, c: C.bonbon, k: "rect", f: 3 },
  { x: 30, y: 10, r: -35, c: C.ciel, k: "rect" },
  { x: 70, y: 8, r: 25, c: C.bonbon, k: "dot", f: 2 },
  { x: 80, y: 26, r: -15, c: C.roi, k: "rect", f: 1 },
  { x: 92, y: 14, r: 40, c: C.soleil, k: "tri" },
  { x: 88, y: 58, r: -30, c: C.menthe, k: "rect", f: 3 },
  { x: 76, y: 78, r: 15, c: C.cerise, k: "dot" },
  { x: 95, y: 86, r: 60, c: C.ciel, k: "tri", f: 1 },
  { x: 60, y: 92, r: -10, c: C.soleil, k: "rect" },
  { x: 38, y: 90, r: 20, c: C.bonbon, k: "rect", f: 2 },
];

function Shape({ p }: { p: Piece }) {
  const t = `translate(${p.x * 10} ${p.y * 6}) rotate(${p.r})`;
  if (p.k === "dot") return <circle transform={t} r="9" fill={p.c} />;
  if (p.k === "tri") return <path transform={t} d="M0 -13 L12 9 L-12 9 Z" fill={p.c} />;
  return <rect transform={t} x="-14" y="-6" width="28" height="12" rx="3" fill={p.c} />;
}

export function HeroArcs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
      {/* halos de couleur (dégradés statiques, sans filtre de flou) */}
      <div className="absolute -top-40 left-1/2 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(61_90_254/0.45),transparent)]" />
      <div className="absolute -top-20 -right-40 h-[28rem] w-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_61_104/0.28),transparent)]" />
      <div className="absolute top-40 -left-40 h-[26rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_210_63/0.16),transparent)]" />
      {/* serpentins */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        <path d="M-20 120 C 80 40, 160 200, 260 110 S 420 60, 470 140" fill="none" stroke={C.bonbon} strokeWidth="5" strokeLinecap="round" opacity="0.55" />
        <path d="M1020 420 C 920 500, 840 340, 740 430 S 590 500, 540 420" fill="none" stroke={C.ciel} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
        {PIECES.map((p, i) => (
          <g key={i} className={p.f ? `confetti confetti-${p.f}` : undefined} style={{ transformOrigin: `${p.x * 10}px ${p.y * 6}px` }}>
            <Shape p={p} />
          </g>
        ))}
      </svg>
    </div>
  );
}
