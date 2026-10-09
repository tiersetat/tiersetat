"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const icon = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  buzz: "M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9Z",
  trophy: "M8 4h8v4a4 4 0 0 1-8 0zM6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 12v4m-4 4h8m-6-4h4v4h-4z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

const TABS = [
  { href: "/", label: "Accueil", d: icon.home },
  { href: "/ca-buzz", label: "Ça buzz", d: icon.buzz },
  { href: "/lancer", label: "Frapper", d: "", center: true },
  { href: "/semaine", label: "Semaine", d: icon.trophy },
];

const PLUS = [
  { href: "/radar", label: "Radar" },
  { href: "/classements", label: "Classements" },
  { href: "/clans", label: "Clans" },
  { href: "/cahiers", label: "Cahiers" },
  { href: "/portefeuille", label: "Portefeuille" },
  { href: "/abonnements", label: "Abonnements" },
  { href: "/recherche", label: "Rechercher" },
  { href: "/dette", label: "La dette" },
  { href: "/assemblee", label: "Assemblée" },
  { href: "/vision", label: "Vision" },
  { href: "/verifier", label: "Vérifier" },
  { href: "/demarrer", label: "Bien démarrer" },
];

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-6 transition ${active ? "text-foreground" : "text-muted-foreground"}`} fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Navigation d'application sur téléphone : onglets en bas, « Frapper » au centre, le reste dans « Plus ». */
export function BottomTabBar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Fermer la feuille « Plus » à chaque changement de page
    Promise.resolve().then(() => setOpen(false));
  }, [path]);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <nav
            aria-label="Plus de pages"
            onClick={(e) => e.stopPropagation()}
            className="animate-in slide-in-from-bottom-8 fade-in absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] grid grid-cols-3 gap-2 rounded-3xl border border-ligne bg-popover p-3 shadow-2xl duration-200"
          >
            {PLUS.map((p) => (
              <Link key={p.href} href={p.href} className={`rounded-2xl px-2 py-3 text-center text-sm active:scale-95 ${isActive(p.href) ? "bg-pervenche/15 text-lueur" : "bg-white/[0.03] text-foreground"}`}>
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ligne bg-nuit/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          {TABS.map((t) =>
            t.center ? (
              <li key={t.href} className="flex justify-center">
                <Link
                  href={t.href}
                  aria-label="Frapper un mème"
                  className="-mt-6 grid size-14 place-items-center rounded-full bg-gradient-to-b from-lueur to-pervenche text-3xl font-light text-nuit shadow-[0_8px_30px_-6px_rgba(140,147,201,0.9)] transition active:scale-90"
                >
                  +
                </Link>
              </li>
            ) : (
              <li key={t.href}>
                <Link href={t.href} className="flex flex-col items-center gap-0.5 py-2 active:scale-90" aria-current={isActive(t.href) ? "page" : undefined}>
                  <Icon d={t.d} active={isActive(t.href)} />
                  <span className={`text-[10px] ${isActive(t.href) ? "text-foreground" : "text-muted-foreground"}`}>{t.label}</span>
                </Link>
              </li>
            ),
          )}
          <li>
            <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full flex-col items-center gap-0.5 py-2 active:scale-90" aria-expanded={open}>
              <Icon d={icon.more} active={open} />
              <span className={`text-[10px] ${open ? "text-foreground" : "text-muted-foreground"}`}>Plus</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
