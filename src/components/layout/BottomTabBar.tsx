"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, PRIMARY } from "./nav";

/** Petit retour haptique, comme sur iPhone (sur les téléphones qui le permettent). */
function tap() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* indisponible */
  }
}

/**
 * Barre du bas façon iOS : verre dépoli transparent, onglets qui réagissent au toucher,
 * et au centre le Tiers-État de 1789 pour créer un mème.
 */
export function BottomTabBar() {
  const path = usePathname();
  const [a, b, c, d] = PRIMARY;
  const tab = (i: (typeof PRIMARY)[number]) => {
    const on = isActive(i, path);
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          onClick={tap}
          aria-current={on ? "page" : undefined}
          className="ios-press group flex flex-col items-center gap-0.5 rounded-2xl py-2"
        >
          <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors duration-300 ${on ? "bg-white/15" : ""}`}>
            <svg viewBox="0 0 24 24" className={`size-6 transition-transform duration-300 ${on ? `${i.color} scale-110` : "text-white/70"}`} fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={i.d} />
            </svg>
          </span>
          <span className={`text-[10px] font-semibold ${on ? "text-white" : "text-white/70"}`}>{i.label}</span>
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 lg:hidden">
      <ul className="ios-glass mx-auto grid max-w-md grid-cols-5 items-center rounded-[28px] px-1.5">
        {tab(a)}
        {tab(b)}
        <li className="flex justify-center">
          <Link href="/lancer" onClick={tap} aria-label="Créer un mème" className="ios-press relative -mt-7 grid size-16 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,rgb(255_210_63/0.55),transparent)]" />
            {/* eslint-disable-next-line @next/next/no-img-element -- image locale */}
            <img src="/images/tiers-etat-bouton.webp" alt="" className="relative h-16 w-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]" />
            <span className="absolute -right-0.5 bottom-0.5 grid size-5 place-items-center rounded-full bg-soleil text-sm font-extrabold leading-none text-nuit ring-2 ring-nuit">+</span>
          </Link>
        </li>
        {tab(c)}
        {tab(d)}
      </ul>
    </nav>
  );
}
