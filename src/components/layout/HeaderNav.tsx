"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavMore } from "./NavMore";

/** Menu de l'îlot (ordinateur) : la page courante est surlignée. */
export function HeaderNav({ items, more }: { items: { href: string; label: string }[]; more: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="hidden items-center gap-0.5 text-sm lg:flex" aria-label="Navigation principale">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active(item.href) ? "page" : undefined}
          className={`whitespace-nowrap rounded-full px-3.5 py-2 font-medium transition ${
            active(item.href) ? "bg-white/[0.1] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
      <NavMore items={more} />
    </nav>
  );
}
