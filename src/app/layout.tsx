import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WalletProviders } from "@/components/providers/WalletProviders";
import { SITE_URL } from "@/lib/solana/config";
import "./globals.css";
import { InviteCapture } from "@/components/invite/InviteCapture";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { LiveTrades } from "@/components/social/LiveTrades";
import { RegisterSW } from "@/components/app/RegisterSW";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tiers-État — Le launchpad des mèmes français",
  description: "Crée ton token à partir d'un mème ou d'une actu française, en 30 secondes, sur Solana.",
  applicationName: "Tiers-État",
  // iPhone : ouverture plein écran depuis l'écran d'accueil
  appleWebApp: { capable: true, title: "Tiers-État", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#030206", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <WalletProviders>
          <InviteCapture />
          <RegisterSW />
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
          <Footer />
          <BottomTabBar />
          <LiveTrades />
        </WalletProviders>
      </body>
    </html>
  );
}
