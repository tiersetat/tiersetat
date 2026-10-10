"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Logo";
import { InstallApp } from "@/components/app/InstallApp";

const I = {
  fil: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  buzz: "M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9Z",
  radar: "M12 12 19 5M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5",
  trophy: "M8 4h8v4a4 4 0 0 1-8 0zM6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 12v4m-4 4h8m-6-4h4v4h-4z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  book: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10",
  wallet: "M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM3 7l12-3v3m2 6h.01",
  debt: "M3 17l6-6 4 4 8-8m0 0v5m0-5h-5",
  vote: "M4 20h16M6 20V10l6-6 6 6v10M10 20v-5h4v5",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  scroll: "M8 3h10v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2h10v2a3 3 0 0 0 3 3M8 3a3 3 0 0 0-3 3v9",
};

const MAIN = [
  { href: "/", label: "Accueil", d: I.home },
  { href: "/fil", label: "Le fil", d: I.fil },
  { href: "/ca-buzz", label: "Ça buzz", d: I.buzz },
  { href: "/radar", label: "Radar", d: I.radar },
  { href: "/semaine", label: "Mème de la semaine", d: I.trophy },
  { href: "/classements", label: "Classements", d: I.chart },
  { href: "/clans", label: "Clans", d: I.flag },
  { href: "/cahiers", label: "Cahiers de doléances", d: I.book },
  { href: "/portefeuille", label: "Portefeuille", d: I.wallet },
];
const MORE = [
  { href: "/dette", label: "La dette en direct", d: I.debt },
  { href: "/assemblee", label: "L'Assemblée", d: I.vote },
  { href: "/vision", label: "Vision", d: I.eye },
  { href: "/verifier", label: "Vérifier", d: I.shield },
  { href: "/manifeste", label: "Manifeste", d: I.scroll },
];

function Item({ href, label, d, active }: { href: string; label: string; d: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] font-medium transition ${
        active ? "bg-white/[0.1] font-semibold text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
      }`}
    >
      <svg viewBox="0 0 24 24" className={`size-5 shrink-0 ${active ? "text-soleil" : ""}`} fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** Menu latéral (ordinateur), comme les grandes plateformes de lancement : tout visible, la page courante surlignée. */
export function Sidebar() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0d1033] px-3 py-5 lg:flex">
      <Link href="/" aria-label="Tiers-État, accueil" className="px-3">
        <Wordmark />
      </Link>
      <Link href="/lancer" className="btn-fete mx-1 mt-6">
        + Frapper un mème
      </Link>
      <nav aria-label="Navigation principale" className="no-scrollbar mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {MAIN.map((i) => (
          <Item key={i.href} {...i} active={active(i.href)} />
        ))}
        <p className="mt-5 mb-1 px-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">En savoir plus</p>
        {MORE.map((i) => (
          <Item key={i.href} {...i} active={active(i.href)} />
        ))}
      </nav>
      <div className="mt-4 space-y-2 px-1">
        <InstallApp />
        <a href="https://x.com/tiersetats" target="_blank" rel="noreferrer" className="block px-2 text-xs text-muted-foreground hover:text-foreground">
          @tiersetats sur X ↗
        </a>
      </div>
    </aside>
  );
}
