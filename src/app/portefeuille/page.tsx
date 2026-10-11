import type { Metadata } from "next";
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
    </div>
  );
}
