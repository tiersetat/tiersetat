"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITEMS = [
  { href: "/classements?tab=traders", label: "Traders", is: (p: string, t: string | null) => p === "/classements" && t === "traders" },
  { href: "/classements", label: "Créateurs", is: (p: string, t: string | null) => p === "/classements" && (t === null || t === "createurs") },
  { href: "/semaine", label: "🏆 Mème de la semaine", is: (p: string) => p.startsWith("/semaine") },
  { href: "/clans", label: "Clans", is: (p: string, t: string | null) => p.startsWith("/clans") || (p === "/classements" && t === "clans") },
  { href: "/cahiers", label: "Points", is: (p: string) => p.startsWith("/cahiers") },
];

/** Onglets de l'espace « Classement », identiques sur chacune de ses pages. */
export function RankNav() {
  const path = usePathname();
  const tab = useSearchParams().get("tab");
  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-extrabold">Classement</h1>
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Classements">
        {ITEMS.map((i) => {
          const on = i.is(path, tab);
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={`chip shrink-0 ${on ? "chip-active" : ""}`}>
              {i.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
