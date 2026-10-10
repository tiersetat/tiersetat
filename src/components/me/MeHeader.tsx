"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";

/** En-tête de « Moi » : avatar, pseudo, accès au profil public. */
export function MeHeader() {
  const { publicKey } = useWallet();
  const { profile } = useSession();
  if (!publicKey) return null;
  const wallet = publicKey.toBase58();
  const mine = profile?.wallet === wallet ? profile : null;
  return (
    <div className="flex items-center gap-4">
      <Avatar wallet={wallet} pseudo={mine?.pseudo} url={mine?.avatar_url} size={64} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-[family-name:var(--font-display)] text-2xl font-extrabold">{displayName({ wallet, pseudo: mine?.pseudo })}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {wallet.slice(0, 4)}…{wallet.slice(-4)}
        </p>
      </div>
      <Link href={`/profil/${wallet}`} className="btn-ghost min-h-10 shrink-0 px-4 py-2 text-sm">
        Mon profil
      </Link>
    </div>
  );
}
