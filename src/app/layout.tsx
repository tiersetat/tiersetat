import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
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
import { AuthGate } from "@/components/layout/AuthGate";
import { Workspace } from "@/components/layout/Workspace";
import { Starfield } from "@/components/layout/Starfield";
import { DemoMode } from "@/components/app/DemoMode";
import { InstallSheet } from "@/components/app/InstallSheet";
import { DemoAccount } from "@/components/app/DemoAccount";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Titres : police d'affiche, chaleureuse et mémorable
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], axes: ["opsz", "wdth"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tiers-État — Le launchpad des mèmes français",
  description: "Crée ton token à partir d'un mème ou d'une actu française, en 30 secondes, sur Solana.",
  applicationName: "Tiers-État",
  // iPhone : ouverture plein écran depuis l'écran d'accueil
  appleWebApp: {
    capable: true,
    title: "Tiers-État",
    statusBarStyle: "black-translucent",
    // Écran de lancement de l'appli installée : la Terre la nuit vue de l'espace (lumières en or) et le logo
    startupImage: [
    { url: "/splash/1320x2868.jpg", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/1290x2796.jpg", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/1206x2622.jpg", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/1179x2556.jpg", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/1284x2778.jpg", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/1170x2532.jpg", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/1125x2436.jpg", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/1242x2688.jpg", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/828x1792.jpg", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    { url: "/splash/1242x2208.jpg", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    { url: "/splash/750x1334.jpg", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    { url: "/splash/640x1136.jpg", media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    { url: "/splash/2048x2732.jpg", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    { url: "/splash/1668x2388.jpg", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    { url: "/splash/1640x2360.jpg", media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    { url: "/splash/1536x2048.jpg", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
  },
};

export const viewport: Viewport = { themeColor: "#0b0d2a", viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geist.variable} ${geistMono.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* Fond d'écran : ciel vivant d'étoiles bleu-blanc-rouge */}
        <Starfield />
        <DemoMode />
        <InstallSheet />
        <WalletProviders>
          <InviteCapture />
          <DemoAccount />
          <RegisterSW />
          <AuthGate>
          <Header />
          <div className="flex flex-1 flex-col lg:pl-64">
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 xl:max-w-none xl:px-6">
              {/* Fondu enchaîné entre les pages (API View Transitions du navigateur) */}
              <Workspace>
                <ViewTransition>{children}</ViewTransition>
              </Workspace>
            </main>
            <Footer />
          </div>
          <Sidebar />
          <BottomTabBar />
          <LiveTrades />
          </AuthGate>
        </WalletProviders>
      </body>
    </html>
  );
}
