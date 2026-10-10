"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { useStandardWallets, type PrivyStandardWallet } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { registerWallet } from "@wallet-standard/wallet";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { CLUSTER, RPC_URL } from "@/lib/solana/config";

export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
/** Nom sous lequel le wallet intégré Privy s'annonce (Wallet Standard). */
const PRIVY_WALLET_NAME = "Privy";

/**
 * Connexion par e-mail / Google sans phrase secrète (comme FOMO) :
 * Privy crée un wallet Solana « MPC » pour l'utilisateur et l'expose comme un wallet standard,
 * donc tout le reste du site (achat, vente, création, signature) fonctionne sans changement.
 * Inactif tant que NEXT_PUBLIC_PRIVY_APP_ID n'est pas défini.
 */
export function PrivyBridge({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) return <>{children}</>;
  const chain = CLUSTER === "devnet" ? "solana:devnet" : "solana:mainnet";
  const wsUrl = RPC_URL.replace(/^http/, "ws");
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Apple nécessite un compte Apple Developer : à ajouter avec l'appli mobile
        loginMethods: ["email", "google"],
        appearance: { theme: "dark", accentColor: "#3D5AFE", walletChainType: "solana-only", logo: "/images/logo.png" },
        embeddedWallets: { solana: { createOnLogin: "all-users" } },
        solana: { rpcs: { [chain]: { rpc: createSolanaRpc(RPC_URL), rpcSubscriptions: createSolanaRpcSubscriptions(wsUrl) } } },
      }}
    >
      <PrivyWalletRegistrar />
      {children}
    </PrivyProvider>
  );
}

/** Annonce le wallet Privy au wallet-adapter, puis le sélectionne automatiquement après une connexion e-mail. */
function PrivyWalletRegistrar() {
  const { wallets } = useStandardWallets();
  const { authenticated } = usePrivy();
  const { select, connected, wallet } = useWallet();
  const registered = useRef(false);

  // PrivyStandardWallet n'existe qu'en type : on le reconnaît à sa propriété isPrivyWallet
  const privyWallet = wallets.find((w): w is PrivyStandardWallet => "isPrivyWallet" in w && (w as PrivyStandardWallet).isPrivyWallet);

  useEffect(() => {
    if (!privyWallet || registered.current) return;
    registered.current = true;
    registerWallet(privyWallet);
  }, [privyWallet]);

  useEffect(() => {
    if (authenticated && privyWallet && !connected && wallet?.adapter.name !== PRIVY_WALLET_NAME) {
      select(PRIVY_WALLET_NAME as WalletName);
    }
  }, [authenticated, privyWallet, connected, wallet, select]);

  return null;
}

/** Bouton « Continuer avec un e-mail » (affiché seulement si Privy est configuré). */
export function EmailLoginButton() {
  if (!PRIVY_APP_ID) return null;
  return <EmailLoginInner />;
}

function EmailLoginInner() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { connected } = useWallet();
  if (!ready || (connected && !authenticated)) return null;
  return authenticated ? (
    <button type="button" onClick={() => void logout()} className="hidden text-xs text-muted-foreground hover:text-foreground sm:block">
      Déconnexion e-mail
    </button>
  ) : (
    <button
      type="button"
      onClick={() => login()}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-extrabold text-nuit shadow-[0_6px_18px_-8px_rgb(255_255_255/0.6)] transition active:scale-95 xl:px-5"
    >
      {/* Logo Google (couleurs officielles) */}
      <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
      </svg>
      <span className="xl:hidden">Se connecter</span>
      <span className="hidden xl:inline">Continuer avec Google ou e-mail</span>
    </button>
  );
}

/** Bouton « Se connecter » des pages : Google ou e-mail (Privy), sinon la fenêtre des wallets. */
export function LoginCta({ className = "btn-fete", children, fallback }: { className?: string; children: ReactNode; fallback: () => void }) {
  if (!PRIVY_APP_ID) {
    return (
      <button type="button" onClick={fallback} className={className}>
        {children}
      </button>
    );
  }
  return <LoginCtaInner className={className} fallback={fallback}>{children}</LoginCtaInner>;
}

function LoginCtaInner({ className, children, fallback }: { className: string; children: ReactNode; fallback: () => void }) {
  const { ready, login } = usePrivy();
  return (
    <button type="button" onClick={() => (ready ? login() : fallback())} className={className}>
      {children}
    </button>
  );
}
