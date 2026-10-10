import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Bricolage_Grotesque, Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WalletProviders } from "@/components/providers/WalletProviders";
import { SITE_URL } from "@/lib/solana/config";
import "./globals.css";
import { InviteCapture } from "@/components/invite/InviteCapture";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { LiveTrades } from "@/components/social/LiveTrades";
import { Sidebar } from "@/components/layout/Sidebar";
import { RegisterSW } from "@/components/app/RegisterSW";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Titres : police d'affiche, chaleureuse et mémorable
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], axes: ["opsz", "wdth"] });
// La Gazette : typographie de journal pour le titre et les manchettes
const gazette = Playfair_Display({ variable: "--font-gazette", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tiers-État — Le launchpad des mèmes français",
  description: "Crée ton token à partir d'un mème ou d'une actu française, en 30 secondes, sur Solana.",
  applicationName: "Tiers-État",
  // iPhone : ouverture plein écran depuis l'écran d'accueil
  appleWebApp: { capable: true, title: "Tiers-État", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0b0d2a", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geist.variable} ${geistMono.variable} ${display.variable} ${gazette.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <WalletProviders>
          <InviteCapture />
          <RegisterSW />
          <Header />
          <div className="flex flex-1 flex-col lg:pl-64">
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
              {/* Fondu enchaîné entre les pages (API View Transitions du navigateur) */}
              <ViewTransition>{children}</ViewTransition>
            </main>
            <Footer />
          </div>
          <Sidebar />
          <BottomTabBar />
          <LiveTrades />
        </WalletProviders>
      </body>
    </html>
  );
}
