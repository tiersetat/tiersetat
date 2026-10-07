/**
 * Arcs lumineux de la bannière Tiers-État (haut gauche, bas droite), en fond de l'accueil.
 * Pur SVG + CSS : aucun coût JavaScript, animation coupée si l'utilisateur réduit les animations.
 */
export function HeroArcs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
    >
      <svg className="hero-arc absolute -top-[50rem] -left-[44rem] h-[64rem] w-[64rem] opacity-70 sm:-top-[42rem] sm:-left-[30rem] sm:opacity-100" viewBox="0 0 1000 1000">
        <defs>
          <radialGradient id="arc-fill-a" cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor="#0b0d24" stopOpacity="0" />
            <stop offset="96%" stopColor="#2a3a9e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6f86ff" stopOpacity="0.55" />
          </radialGradient>
          <filter id="arc-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="500" cy="500" r="490" fill="url(#arc-fill-a)" />
        <circle cx="500" cy="500" r="490" fill="none" stroke="#9fb1ff" strokeWidth="2.5" filter="url(#arc-glow)" />
        <circle cx="500" cy="500" r="490" fill="none" stroke="#5b74ff" strokeWidth="14" strokeOpacity="0.25" />
      </svg>

      <svg className="hero-arc hero-arc-delay absolute -right-[48rem] -bottom-[60rem] h-[70rem] w-[70rem] opacity-70 sm:-right-[34rem] sm:-bottom-[46rem] sm:opacity-100" viewBox="0 0 1000 1000">
        <defs>
          <radialGradient id="arc-fill-b" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#0b0d24" stopOpacity="0" />
            <stop offset="96%" stopColor="#2a3a9e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6f86ff" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="500" r="490" fill="url(#arc-fill-b)" />
        <circle cx="500" cy="500" r="490" fill="none" stroke="#9fb1ff" strokeWidth="2.5" filter="url(#arc-glow)" />
        <circle cx="500" cy="500" r="490" fill="none" stroke="#5b74ff" strokeWidth="14" strokeOpacity="0.25" />
        {/* second arc intérieur, comme sur la bannière */}
        <circle cx="560" cy="540" r="430" fill="none" stroke="#7d93ff" strokeWidth="1.5" strokeOpacity="0.55" filter="url(#arc-glow)" />
      </svg>
    </div>
  );
}
