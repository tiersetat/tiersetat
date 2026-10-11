"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isActive, PRIMARY } from "./nav";

type Slot = { href: string; label: string; d?: string; color?: string; center?: boolean };

/** Petit retour haptique, comme sur iPhone (sur les téléphones qui le permettent). */
function tap() {
  try {
    navigator.vibrate?.(6);
  } catch {
    /* indisponible */
  }
}

/**
 * Barre du bas façon iOS : verre transparent, et une pastille lumineuse qui suit le doigt
 * quand on glisse d'un onglet à l'autre (la page s'ouvre au relâchement).
 */
export function BottomTabBar() {
  const path = usePathname();
  const router = useRouter();
  const bar = useRef<HTMLUListElement>(null);
  const [a, b, c, d] = PRIMARY;
  const slots: Slot[] = [a, b, { href: "/lancer", label: "Créer", center: true }, c, d];
  const activeIndex = slots.findIndex((s) => (s.center ? path.startsWith("/lancer") : isActive(s as (typeof PRIMARY)[number], path)));
  const [hover, setHover] = useState<number | null>(null);
  const [pressing, setPressing] = useState(false);
  const shown = hover ?? activeIndex;

  const indexAt = (x: number) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r) return null;
    return Math.max(0, Math.min(slots.length - 1, Math.floor(((x - r.left) / r.width) * slots.length)));
  };
  const onDown = (e: React.PointerEvent) => {
    const i = indexAt(e.clientX);
    setPressing(true);
    setHover(i);
    tap();
  };
  const onMove = (e: React.PointerEvent) => {
    if (!pressing) return;
    const i = indexAt(e.clientX);
    if (i !== null && i !== hover) {
      setHover(i);
      tap();
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const i = indexAt(e.clientX);
    setPressing(false);
    setHover(null);
    if (i !== null && slots[i].href !== path) router.push(slots[i].href);
  };

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 lg:hidden">
      <ul
        ref={bar}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          setPressing(false);
          setHover(null);
        }}
        className="ios-glass relative mx-auto grid max-w-md touch-none grid-cols-5 items-center rounded-[30px] px-1 select-none"
      >
        {/* Pastille lumineuse qui glisse sous le doigt */}
        {shown >= 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1.5 left-1 rounded-[24px] bg-white/[0.14] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.34,1.4,0.64,1)]"
            style={{ width: "calc((100% - 0.5rem) / 5)", transform: `translateX(${shown * 100}%) scale(${pressing ? 1.08 : 1})` }}
          />
        )}
        {slots.map((s, i) => {
          const on = i === shown;
          return (
            <li key={s.href} className="relative">
              <Link
                href={s.href}
                onClick={(e) => e.detail !== 0 && e.preventDefault()}
                aria-label={s.center ? "Créer un mème" : undefined}
                aria-current={i === activeIndex ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 py-2 transition-transform duration-300"
                style={{ transform: on && pressing ? "scale(1.12)" : "scale(1)" }}
              >
                {s.center ? (
                  // eslint-disable-next-line @next/next/no-img-element -- image locale
                  <img src="/images/tiers-etat-bouton.webp" alt="" className="h-6 w-auto drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]" />
                ) : (
                  <svg viewBox="0 0 24 24" className={`size-6 transition-colors duration-300 ${on ? s.color : "text-white/75"}`} fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={s.d} />
                  </svg>
                )}
                <span className={`text-[10px] font-semibold transition-colors duration-300 ${on ? "text-white" : "text-white/75"}`}>{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
