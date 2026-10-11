"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_VIEW, MAP_RATIO, onMapView, readMapView, viewLights, type MapView, type Variant } from "@/lib/france-map";
import { MapPulses } from "./MapPulses";

/**
 * « Le monde qui trade » : la Terre la nuit vue de l'espace (photos NASA), vue au choix (France par défaut).
 * Les villes scintillent doucement ; une onde de lumière part du pays (ou de la région) de chaque vrai trader.
 * CSS uniquement pour l'ambiance (transform et opacity), coupé si l'utilisateur réduit les animations.
 */
function MapBox({ view, variant, className }: { view: MapView; variant: Variant; className: string }) {
  const r = MAP_RATIO[variant];
  return (
    <div
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`}
      style={{ width: `max(100cqw, calc(100cqh * ${r}))`, height: `max(100cqh, calc(100cqw / ${r}))` }}
    >
      <div key={view} className="map-fade absolute inset-0 bg-cover" style={{ backgroundImage: `url(/images/carte/${view}-${variant}.webp)` }} />
      {viewLights(view, variant).map(([x, y], i) => (
        <span
          key={`${view}-${i}`}
          className="city-glow absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.83) % 7}s`, animationDuration: `${5 + (i % 4)}s` }}
        />
      ))}
      <MapPulses view={view} variant={variant} />
    </div>
  );
}

export function Starfield({ dim = true }: { dim?: boolean }) {
  const view = useSyncExternalStore(onMapView, readMapView, () => DEFAULT_VIEW);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-nuit [container-type:size]">
      <MapBox view={view} variant="m" className="sm:hidden" />
      <MapBox view={view} variant="d" className="sky-drift hidden sm:block" />
      {dim && <div className="absolute inset-0 bg-nuit/30" />}
    </div>
  );
}
