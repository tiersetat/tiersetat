"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_VIEW,
  MAP_VIEWS,
  onMapView,
  readMapView,
  saveMapView,
} from "@/lib/france-map";

/** Petit outil du haut de l'écran : choisir la zone du monde affichée en fond (France, Monde, États-Unis, Chine…). */
export function MapViewPicker() {
  const view = useSyncExternalStore(onMapView, readMapView, () => DEFAULT_VIEW);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !box.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Changer la carte du fond"
        className="ios-press grid size-10 place-items-center rounded-full border border-white/20 bg-white/[0.08] text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9S9.4 5.8 12 3z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-12 z-[70] w-60 sm:left-auto sm:right-0 rounded-2xl border border-white/15 bg-[#0b0d2a]/95 p-1.5 shadow-[0_20px_50px_-15px_rgb(0_0_0/0.8)] backdrop-blur-md"
        >
          <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground">
            Qui trade, où ? Choisis la carte
          </p>
          {MAP_VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="menuitemradio"
              aria-checked={view === v.key}
              onClick={() => {
                saveMapView(v.key);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-white/[0.08] ${view === v.key ? "text-white" : "text-white/75"}`}
            >
              {v.label}
              {view === v.key && (
                <span
                  className="size-2 rounded-full bg-[#ffd68a] shadow-[0_0_10px_2px_rgb(255_214_138/0.7)]"
                  aria-hidden
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
