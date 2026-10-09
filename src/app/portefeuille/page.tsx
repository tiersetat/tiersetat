import type { Metadata } from "next";
import { PortfolioView } from "@/components/social/PortfolioView";

export const metadata: Metadata = { title: "Mon portefeuille — Tiers-État" };

export default function PortefeuillePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Mon portefeuille</h1>
        <p className="text-sm text-muted-foreground">Tes tokens Tiers-État, leur valeur actuelle et tes gains ou pertes, lus sur la blockchain.</p>
      </header>
      <PortfolioView />
    </div>
  );
}
