"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

/** Lien vers le récap de position du wallet connecté (la page répond 404 s'il n'a jamais tradé ce token). */
export function MyPositionLink({ mint }: { mint: string }) {
  const { publicKey } = useWallet();
  if (!publicKey) return null;
  return (
    <Link href={`/token/${mint}/position/${publicKey.toBase58()}`} className="chip text-achat">
      Ma position
    </Link>
  );
}
