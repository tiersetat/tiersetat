"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Rangée horizontale qui défile doucement toute seule, et reste glissable au doigt.
 * Pause au survol, au toucher et pendant 4 s après une interaction ; aucun défilement
 * automatique si l'utilisateur a demandé à réduire les animations.
 */
export function AutoScroller({ children, speed = 28, className = "" }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let pausedUntil = 0;
    let hovering = false;
    let last = performance.now();
    let carry = 0;
    let frame = 0;

    const pause = () => (pausedUntil = performance.now() + 4000);
    const enter = () => (hovering = true);
    const leave = () => (hovering = false);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("wheel", pause, { passive: true });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);

    const tick = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (!hovering && now > pausedUntil && el.scrollWidth > el.clientWidth) {
        // Arrivé au bout : on revient au début après une courte pause
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
          el.scrollTo({ left: 0, behavior: "smooth" });
          pausedUntil = now + 2500;
        } else {
          carry += (speed * dt) / 1000;
          const step = Math.floor(carry);
          if (step > 0) {
            el.scrollLeft += step;
            carry -= step;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("wheel", pause);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [speed]);

  return (
    <div ref={ref} className={`no-scrollbar flex gap-4 overflow-x-auto pb-2 ${className}`}>
      {children}
    </div>
  );
}
