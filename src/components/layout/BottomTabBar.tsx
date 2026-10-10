"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, PRIMARY } from "./nav";

/** Navigation sur téléphone : Marché, Fil, « + » (frapper un mème), Classement, Moi. */
export function BottomTabBar() {
  const path = usePathname();
  const [a, b, c, d] = PRIMARY;
  const tab = (i: (typeof PRIMARY)[number]) => {
    const on = isActive(i, path);
    return (
      <li key={i.href}>
        <Link href={i.href} className="flex flex-col items-center gap-0.5 py-2 active:scale-90" aria-current={on ? "page" : undefined}>
          <svg viewBox="0 0 24 24" className={`size-6 transition ${on ? i.color : "text-muted-foreground"}`} fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={i.d} />
          </svg>
          <span className={`text-[10px] font-semibold ${on ? "text-foreground" : "text-muted-foreground"}`}>{i.label}</span>
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-50 border-t border-ligne bg-nuit/95 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {tab(a)}
        {tab(b)}
        <li className="flex justify-center">
          <Link
            href="/lancer"
            aria-label="Frapper un mème"
            className="-mt-6 grid size-14 place-items-center rounded-full bg-gradient-to-b from-[#ffe17a] to-soleil text-3xl font-bold text-nuit shadow-[0_5px_0_-1px_#c79400,0_12px_28px_-8px_rgb(255_210_63/0.9)] ring-4 ring-nuit transition active:translate-y-1 active:shadow-none"
          >
            +
          </Link>
        </li>
        {tab(c)}
        {tab(d)}
      </ul>
    </nav>
  );
}
