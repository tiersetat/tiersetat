import { CLAN_CITIES, MAP_RATIO } from "@/lib/france-map";
import { MapPulses } from "./MapPulses";

/**
 * « La France qui trade » : la France la nuit vue de l'espace (photo NASA) en fond d'écran.
 * Les grandes villes scintillent doucement ; une onde de lumière part de la région de chaque vrai acheteur (MapPulses).
 * CSS uniquement pour l'ambiance (transform et opacity), coupé si l'utilisateur réduit les animations.
 */
const CITIES = Object.values(CLAN_CITIES);

/** La boîte garde les proportions de l'image et la couvre comme `background-size: cover`, pour que les points tombent sur les villes. */
function MapBox({ variant, className }: { variant: "m" | "d"; className: string }) {
  const r = MAP_RATIO[variant];
  return (
    <div
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`}
      style={{ width: `max(100cqw, calc(100cqh * ${r}))`, height: `max(100cqh, calc(100cqw / ${r}))` }}
    >
      <div
        className="absolute inset-0 bg-cover"
        style={{ backgroundImage: `url(/images/${variant === "m" ? "france-nuit-mobile" : "france-nuit"}.webp)` }}
      />
      {CITIES.map((c, i) => (
        <span
          key={c.name}
          className="city-glow absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${c[variant][0]}%`, top: `${c[variant][1]}%`, animationDelay: `${(i * 0.83) % 7}s`, animationDuration: `${5 + (i % 4)}s` }}
        />
      ))}
      <MapPulses variant={variant} />
    </div>
  );
}

export function Starfield({ dim = true }: { dim?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-nuit [container-type:size]">
      <MapBox variant="m" className="sm:hidden" />
      <MapBox variant="d" className="sky-drift hidden sm:block" />
      {dim && <div className="absolute inset-0 bg-nuit/30" />}
    </div>
  );
}
