/**
 * Ciel vivant : la nébuleuse tricolore dérive très lentement et des étoiles scintillent devant.
 * CSS uniquement (transform et opacity), coupé si l'utilisateur réduit les animations.
 */
const TWINKLES = Array.from({ length: 14 }, (_, i) => {
  const x = (i * 37) % 100;
  const y = (i * 61 + 13) % 100;
  const color = x < 38 ? "#8ca5ff" : x < 62 ? "#ffffff" : "#ff7390";
  return { x, y, color, size: 2 + (i % 3), delay: (i * 0.73) % 6, dur: 3 + (i % 4) };
});

export function Starfield({ dim = true }: { dim?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-nuit">
      <div className="sky-drift absolute inset-0 lg:-inset-[6%] bg-[url(/images/etoiles-tricolores-mobile.webp)] bg-cover bg-center sm:bg-[url(/images/etoiles-tricolores.webp)]" />
      {TWINKLES.map((t, i) => (
        <span
          key={i}
          className="twinkle absolute rounded-full"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            width: t.size,
            height: t.size,
            background: t.color,
            boxShadow: `0 0 ${t.size * 2}px ${t.color}`,
            animationDelay: `${t.delay}s`,
            animationDuration: `${t.dur}s`,
          }}
        />
      ))}
      {dim && <div className="absolute inset-0 bg-nuit/45" />}
    </div>
  );
}
