"use client";

import { useWallet } from "@solana/wallet-adapter-react";

/** Contenu de présentation (vitrine, explications) : réservé aux visiteurs. Une fois connecté, on va droit au marché. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  return connected ? null : <>{children}</>;
}
