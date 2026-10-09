"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Menu « Plus » de l'en-tête (ordinateur) : les pages secondaires, pour garder l'en-tête sur une ligne. */
export function NavMore({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => {
    Promise.resolve().then(() => setOpen(false));
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="whitespace-nowrap rounded-lg px-3 py-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
      >
        Plus <span aria-hidden className={`inline-block transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 absolute left-0 z-50 mt-2 grid w-56 gap-0.5 rounded-2xl border border-ligne bg-popover p-2 shadow-2xl duration-150">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className={`rounded-xl px-3 py-2 text-sm hover:bg-white/5 ${path.startsWith(i.href) ? "text-foreground" : "text-muted-foreground"}`}>
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
