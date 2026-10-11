"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isActive, PRIMARY } from "./nav";

type Slot = { href: string; label: string; d?: string; color?: string; center?: boolean };
const N = 5;

/** Petit retour haptique, comme sur iPhone (sur les téléphones qui le permettent). */
function tap() {
  try {
    navigator.vibrate?.(5);
  } catch {
    /* indisponible */
  }
}

/**
 * Barre du bas façon iOS, uniquement des icônes : verre transparent, et une pastille lumineuse qui suit
 * le doigt en continu pendant le glissé, puis se cale avec un ressort sur l'onglet choisi (ouvert au relâchement).
 */
export function BottomTabBar() {
  const path = usePathname();
  const router = useRouter();
  const bar = useRef<HTMLUListElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const lastIndex = useRef<number | null>(null);
  const [a, b, c, d] = PRIMARY;
  const slots: Slot[] = [a, b, { href: "/lancer", label: "Créer un mème", center: true }, c, d];
  const activeIndex = slots.findIndex((s) => (s.center ? path.startsWith("/lancer") : isActive(s as (typeof PRIMARY)[number], path)));
  const [focus, setFocus] = useState<number | null>(null);
  const shown = focus ?? activeIndex;

  /** Place la pastille : sur un onglet (avec ressort) ou exactement sous le doigt (sans délai). */
  const placePill = (x: number | null, index: number, follow: boolean) => {
    const el = pill.current;
    const r = bar.current?.getBoundingClientRect();
    if (!el || !r) return;
    const w = r.width / N;
    const left = follow && x !== null ? Math.max(0, Math.min(r.width - w, x - r.left - w / 2)) : index * w;
    el.style.transition = follow ? "transform 0s, opacity 0.2s" : "transform 0.5s cubic-bezier(0.34, 1.45, 0.64, 1), opacity 0.2s";
    el.style.transform = `translate3d(${left}px, 0, 0) scale(${follow ? 1.12 : 1})`;
    el.style.opacity = index < 0 ? "0" : "1";
  };

  // Pages des onglets préchargées : changement d'onglet instantané
  useEffect(() => {
    for (const s of slots) router.prefetch(s.href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    placePill(null, activeIndex, false);
    const onResize = () => placePill(null, activeIndex, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const indexAt = (x: number) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.max(0, Math.min(N - 1, Math.floor(((x - r.left) / r.width) * N)));
  };
  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const i = indexAt(e.clientX);
    lastIndex.current = i;
    setFocus(i);
    placePill(e.clientX, i, true);
    tap();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const i = indexAt(e.clientX);
    placePill(e.clientX, i, true);
    if (i !== lastIndex.current) {
      lastIndex.current = i;
      setFocus(i);
      tap();
    }
  };
  const end = (go: boolean, x?: number) => {
    if (!dragging.current) return;
    dragging.current = false;
    const i = x === undefined ? activeIndex : indexAt(x);
    placePill(null, go ? i : activeIndex, false);
    setFocus(null);
    if (go && slots[i] && slots[i].href !== path) router.push(slots[i].href);
  };

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.6rem)] z-50 lg:hidden">
      <ul
        ref={bar}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => end(true, e.clientX)}
        onPointerCancel={() => end(false)}
        className="ios-glass relative mx-auto grid h-16 max-w-sm touch-none grid-cols-5 items-center rounded-full select-none"
      >
        {/* Pastille lumineuse : suit le doigt, se cale avec un ressort */}
        <span
          ref={pill}
          aria-hidden
          className="pointer-events-none absolute inset-y-1.5 left-0 rounded-full bg-white/[0.16] shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_6px_20px_-8px_rgb(255_255_255/0.35)] will-change-transform"
          style={{ width: `${100 / N}%`, opacity: activeIndex < 0 ? 0 : 1 }}
        />
        {slots.map((s, i) => {
          const on = i === shown;
          return (
            <li key={s.href} className="relative flex h-full items-center justify-center">
              <Link
                href={s.href}
                onClick={(e) => e.detail !== 0 && e.preventDefault()}
                aria-label={s.label}
                aria-current={i === activeIndex ? "page" : undefined}
                className="grid size-12 place-items-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.45,0.64,1)]"
                style={{ transform: on && focus !== null ? "scale(1.18)" : "scale(1)" }}
              >
                {s.center ? (
                  // eslint-disable-next-line @next/next/no-img-element -- image locale
                  <img src="/images/tiers-etat-bouton.webp" alt="" className="h-8 w-auto drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]" />
                ) : (
                  <svg viewBox="0 0 24 24" className={`size-[26px] transition-colors duration-300 ${on ? s.color : "text-white/80"}`} fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={s.d} />
                  </svg>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
