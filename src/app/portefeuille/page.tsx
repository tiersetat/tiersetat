import type { Metadata } from "next";
import Link from "next/link";
import { PortfolioView } from "@/components/social/PortfolioView";
import { CashWallet } from "@/components/wallet/CashWallet";
import { MeHeader } from "@/components/me/MeHeader";
import { PushToggle } from "@/components/app/PushToggle";
import { InstallApp } from "@/components/app/InstallApp";
import { DISCOVER } from "@/components/layout/nav";
import { ConnectedOnly } from "@/components/layout/ConnectedOnly";

export const metadata: Metadata = { title: "Profil — Tiers-État" };

const SHORTCUTS = [
  { href: "/fil?vue=classement", label: "Classement", sub: "Les traders qui gagnent le plus", color: "bg-soleil" },
  { href: "/demarrer", label: "Bien démarrer", sub: "Le guide en 3 minutes", color: "bg-achat" },
];

/** « Moi » : profil, cash, mèmes détenus, raccourcis et pages à découvrir. */
export default function MoiPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-4xl font-extrabold">Profil</h1>
      <MeHeader />
      <CashWallet />
      <ConnectedOnly>
        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold">Mes mèmes</h2>
          <PortfolioView />
        </section>
      </ConnectedOnly>
      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Raccourcis</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SHORTCUTS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="surface surface-hover flex items-center gap-3 p-4">
                <span className={`size-3 shrink-0 rounded-full ${s.color}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{s.label}</span>
                  <span className="block truncate text-sm text-muted-foreground">{s.sub}</span>
                </span>
                <span className="text-muted-foreground" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="surface space-y-3 p-5">
        <h2 className="text-lg font-extrabold">Notifications et appli</h2>
        <div className="flex flex-wrap items-center gap-3">
          <PushToggle />
          <InstallApp />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">En savoir plus</h2>
        <ul className="flex flex-wrap gap-2">
          {DISCOVER.map((d) => (
            <li key={d.href}>
              <Link href={d.href} className="chip">
                {d.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/cgu" className="chip">
              CGU
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
