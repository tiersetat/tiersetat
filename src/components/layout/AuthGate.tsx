"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LogoMark } from "@/components/brand/Logo";
import { PRIVY_APP_ID } from "@/components/providers/PrivyBridge";

/** Pages lisibles sans compte (obligations légales). */
const PUBLIC = ["/cgu", "/mentions-legales", "/indisponible"];

/**
 * L'appli n'est accessible qu'avec un compte : Google / e-mail (wallet créé automatiquement) ou un wallet Solana.
 * Sans compte, on ne voit que l'écran d'accueil.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (PUBLIC.some((p) => path.startsWith(p))) return <>{children}</>;
  return PRIVY_APP_ID ? <PrivyGate>{children}</PrivyGate> : <WalletGate privy={null}>{children}</WalletGate>;
}

function PrivyGate({ children }: { children: ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  return <WalletGate privy={{ ready, authenticated, login }}>{children}</WalletGate>;
}

function WalletGate({ children, privy }: { children: ReactNode; privy: { ready: boolean; authenticated: boolean; login: () => void } | null }) {
  const { connected, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
    // Laisse le temps à la reconnexion automatique (wallet ou session Google) avant d'afficher l'écran de connexion
    const id = setTimeout(() => setSettled(true), 1200);
    return () => clearTimeout(id);
  }, []);

  if (connected) return <>{children}</>;
  const waiting = !mounted || connecting || !settled || (privy !== null && (!privy.ready || privy.authenticated));
  if (waiting) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-nuit">
        <LogoMark size={72} className="animate-pulse" />
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-nuit bg-[url(/images/etoiles-tricolores.webp)] bg-cover bg-center">
      <main className="relative mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-7 px-6 py-10 text-center">
        {/* Le Tiers-État de 1789, perdu dans l'espace */}
        {/* eslint-disable-next-line @next/next/no-img-element -- image locale, animée en CSS */}
        <img
          src="/images/tiers-etat-1789.webp"
          alt="Le Tiers-État portant le clergé et la noblesse, caricature de 1789, flottant dans l'espace"
          className="adrift w-56 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] sm:w-64"
        />
        <div className="space-y-3">
          <h1 className="flex items-center justify-center gap-3 font-[family-name:var(--font-display)] text-5xl font-extrabold">
            <LogoMark size={44} />
            Tiers-État
          </h1>
          <p className="text-lg text-muted-foreground">Crée ton mème. Trade toutes les cryptos. Suis ce que tes amis achètent.</p>
        </div>
        <div className="w-full space-y-3">
          {privy && (
            <button type="button" onClick={() => privy.login()} className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-white text-[17px] font-extrabold text-nuit shadow-[0_10px_30px_-10px_rgb(255_255_255/0.6)] transition active:scale-[0.98]">
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
              </svg>
              Continuer avec Google ou e-mail
            </button>
          )}
          <button type="button" onClick={() => setVisible(true)} className="btn-ghost min-h-14 w-full text-[17px]">
            Connecter un wallet
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Réservé aux plus de 18 ans. En continuant, tu acceptes les{" "}
          <Link href="/cgu" className="underline underline-offset-2">
            conditions d&apos;utilisation
          </Link>
          . Les memecoins sont très risqués.
        </p>
      </main>
    </div>
  );
}
