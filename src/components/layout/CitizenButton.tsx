"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/social/Avatar";
import { NotificationBell } from "@/components/social/NotificationBell";
import { displayName } from "@/lib/display";

/** Après la connexion du wallet : signature d'un message pour ouvrir la session. */
export function CitizenButton() {
  const { connected } = useWallet();
  const { profile, status, error, signIn, signOut } = useSession();

  if (status === "signed" && profile) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <Link href="/portefeuille" className="rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground">
          Portefeuille
        </Link>
        <Link href="/abonnements" className="hidden rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground sm:inline">
          Abonnements
        </Link>
        {profile.role === "admin" && (
          <Link href="/admin" className="rounded-lg border border-pervenche/40 bg-pervenche/10 px-3 py-1.5 font-medium text-lueur hover:bg-pervenche/20">
            Admin
          </Link>
        )}
        <NotificationBell />
        <Link href={`/profil/${profile.wallet}`} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5" title="Mon profil">
          <Avatar wallet={profile.wallet} pseudo={profile.pseudo} url={profile.avatar_url} size={26} />
          <span className="hidden max-w-28 truncate font-medium sm:inline">{displayName(profile)}</span>
        </Link>
        <button type="button" onClick={() => void signOut()} className="rounded-lg px-2.5 py-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground" aria-label="Déconnexion" title="Déconnexion">
          ⎋
        </button>
      </div>
    );
  }

  if (!connected) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={() => void signIn()} disabled={status === "signing" || status === "loading"} className="btn-primary h-10 py-0">
        {status === "signing" ? "Signature…" : "Se connecter"}
      </button>
      {error && <p className="max-w-56 text-right text-[11px] text-vente">{error}</p>}
    </div>
  );
}
