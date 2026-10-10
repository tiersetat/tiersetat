"use client";

import { useWallet } from "@solana/wallet-adapter-react";

/** Contenu réservé aux utilisateurs connectés (évite les invitations à se connecter en double). */
export function ConnectedOnly({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  return connected ? <>{children}</> : null;
}
