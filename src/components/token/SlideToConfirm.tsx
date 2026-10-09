"use client";

import { useEffect, useRef, useState } from "react";

/**
 * « Glisser pour confirmer » : on fait glisser le rond jusqu'au bout pour valider un achat ou une vente.
 * Évite les achats par erreur ; au clavier, Entrée ou Espace confirment (accessibilité).
 */
export function SlideToConfirm({ label, tone, disabled, busy, onConfirm }: { label: string; tone: "buy" | "sell"; disabled?: boolean; busy?: boolean; onConfirm: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; max: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [width, setWidth] = useState(300);
  const KNOB = 52;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const confirm = () => {
    try {
      navigator.vibrate?.(20);
    } catch {
      /* vibration indisponible */
    }
    onConfirm();
  };

  const color = tone === "buy" ? "from-[#b5f5d8] to-achat" : "from-[#ffb3c1] to-vente";
  const max = width - KNOB - 8;
  const progress = max > 0 ? offset / max : 0;

  return (
    <div
      ref={track}
      role="button"
      tabIndex={disabled || busy ? -1 : 0}
      aria-label={`${label} (glisser pour confirmer)`}
      aria-disabled={disabled || busy}
      onKeyDown={(e) => {
        if (!disabled && !busy && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          confirm();
        }
      }}
      className={`relative h-[60px] select-none overflow-hidden rounded-full border border-white/10 bg-white/[0.05] outline-none focus-visible:ring-4 focus-visible:ring-pervenche/30 ${disabled ? "opacity-50" : ""}`}
    >
      <div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${color} opacity-30`} style={{ width: offset + KNOB + 8 }} />
      <span className="absolute inset-0 grid place-items-center text-[15px] font-bold tracking-tight" style={{ opacity: 1 - progress * 1.4 }}>
        {busy ? "Signature…" : `${label} →`}
      </span>
      <div
        onPointerDown={(e) => {
          if (disabled || busy) return;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          start.current = { x: e.clientX - offset, max };
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          setOffset(Math.max(0, Math.min(start.current.max, e.clientX - start.current.x)));
        }}
        onPointerUp={() => {
          if (!start.current) return;
          const done = offset >= start.current.max * 0.88;
          start.current = null;
          setDragging(false);
          setOffset(0);
          if (done) confirm();
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setOffset(0);
        }}
        className={`absolute left-1 top-1 grid touch-none place-items-center rounded-full bg-gradient-to-b ${color} text-xl font-bold text-nuit shadow-lg ${dragging ? "" : "transition-transform duration-300"} ${disabled || busy ? "" : "cursor-grab active:cursor-grabbing"}`}
        style={{ width: KNOB, height: KNOB, transform: `translateX(${offset}px)` }}
        aria-hidden
      >
        {busy ? "…" : "»"}
      </div>
    </div>
  );
}
