"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Logo";
import { InstallApp } from "@/components/app/InstallApp";
import { DISCOVER, isActive, PRIMARY } from "./nav";

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Menu latéral (ordinateur) : les 4 mêmes destinations que sur téléphone, l'action « Frapper », et « Découvrir » replié. */
export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0d1033] px-3 py-5 lg:flex">
      <Link href="/" aria-label="Tiers-État, marché" className="px-3">
        <Wordmark />
      </Link>
      <nav aria-label="Navigation principale" className="mt-7 flex flex-col gap-1">
        {PRIMARY.map((i) => {
          const on = isActive(i, path);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-bold transition ${on ? "bg-white/[0.1] text-foreground" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"}`}
            >
              <Icon d={i.d} className={on ? i.color : ""} />
              {i.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/lancer" className="btn-fete mx-1 mt-5">
        + Frapper un mème
      </Link>
      <details className="group mt-6">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80 hover:text-foreground">
          Découvrir
          <span className="transition group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="mt-1 flex flex-col gap-0.5">
          {DISCOVER.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${path.startsWith(i.href) ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon d={i.d} className="size-4" />
              {i.label}
            </Link>
          ))}
        </div>
      </details>
      <div className="mt-auto space-y-2 px-1">
        <InstallApp />
        <a href="https://x.com/tiersetats" target="_blank" rel="noreferrer" className="block px-2 text-xs text-muted-foreground hover:text-foreground">
          @tiersetats sur X ↗
        </a>
      </div>
    </aside>
  );
}
