"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const LABELS = {
  "change-wallet": "Changer de wallet",
  connecting: "Connexion…",
  "copy-address": "Copier l'adresse",
  copied: "Copiée !",
  disconnect: "Se déconnecter",
  "has-wallet": "Se connecter",
  "no-wallet": "Connecter un wallet",
};
// Petit écran : libellé court pour garder l'en-tête sur une seule ligne
const LABELS_MOBILE = { ...LABELS, "no-wallet": "Wallet" };

const query = "(max-width: 639px)";
function subscribe(callback: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
const isMobile = () => window.matchMedia(query).matches;

// Rendu client uniquement : l'état du wallet n'existe pas côté serveur
// (évite les erreurs d'hydratation).
export const WalletButton = dynamic(
  async () => {
    const { BaseWalletMultiButton } = await import(
      "@solana/wallet-adapter-react-ui"
    );
    return function WalletButtonFr() {
      const mobile = useSyncExternalStore(subscribe, isMobile, () => false);
      return <BaseWalletMultiButton labels={mobile ? LABELS_MOBILE : LABELS} />;
    };
  },
  { ssr: false },
);
