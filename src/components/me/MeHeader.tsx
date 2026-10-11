"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";
import { LogoutButtons } from "./LogoutButtons";

/** En-tête compact du profil : avatar, pseudo, adresse et déconnexion. */
export function MeHeader() {
  const { publicKey } = useWallet();
  const { profile } = useSession();
  if (!publicKey)
    return (
      <div className="flex justify-end">
        <LogoutButtons compact />
      </div>
    );
  const wallet = publicKey.toBase58();
  const mine = profile?.wallet === wallet ? profile : null;
  return (
    <div className="flex items-center gap-3">
      <Avatar wallet={wallet} pseudo={mine?.pseudo} url={mine?.avatar_url} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-[family-name:var(--font-display)] text-lg font-extrabold">{displayName({ wallet, pseudo: mine?.pseudo })}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {wallet.slice(0, 4)}…{wallet.slice(-4)}
        </p>
      </div>
      <LogoutButtons compact />
    </div>
  );
}
