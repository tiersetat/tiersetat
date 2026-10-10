import type { Metadata } from "next";
import { PortfolioView } from "@/components/social/PortfolioView";
import { CashWallet } from "@/components/wallet/CashWallet";

export const metadata: Metadata = { title: "Mon portefeuille — Tiers-État" };

export default function PortefeuillePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-4xl font-extrabold">Mon portefeuille</h1>
        <p className="text-sm text-muted-foreground">Ton cash, tes SOL et tes mèmes. Sécurisé, et toujours à toi : Tiers-État n&apos;a jamais accès à tes fonds.</p>
      </header>
      <CashWallet />
      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Mes mèmes</h2>
        <PortfolioView />
      </section>
    </div>
  );
}
