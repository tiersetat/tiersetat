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
    <button type="button" onClick={() => login()} className="btn-ghost h-10 min-h-0 px-4 py-0 text-sm xl:px-5">
      <span className="xl:hidden">E-mail</span>
      <span className="hidden xl:inline">Continuer avec un e-mail</span>
    </button>
  );
}
