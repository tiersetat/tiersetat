import type { Metadata } from "next";
import Link from "next/link";
import { PortfolioView } from "@/components/social/PortfolioView";
import { CashWallet } from "@/components/wallet/CashWallet";
import { MeHeader } from "@/components/me/MeHeader";
import { ConnectedOnly } from "@/components/layout/ConnectedOnly";

export const metadata: Metadata = { title: "Profil — Tiers-État" };

/** Profil, version simple : le cash et les mèmes détenus. */
export default function MoiPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <MeHeader />
      <CashWallet />
      <ConnectedOnly>
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold">Mes mèmes</h2>
          <PortfolioView />
        </section>
      </ConnectedOnly>
      <Link href="/qg" className="surface flex items-center justify-between gap-3 p-4 lg:hidden">
        <span>
          <span className="block font-extrabold">Le QG du Tiers-État</span>
          <span className="block text-sm text-muted-foreground">Rencontrez Jacques Bonhomme et son équipe</span>
        </span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
