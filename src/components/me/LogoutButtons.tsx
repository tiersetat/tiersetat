"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSession } from "@/components/providers/SessionProvider";
import { PRIVY_APP_ID } from "@/components/providers/PrivyBridge";

/** Une étape de déconnexion ne doit jamais bloquer les suivantes (certains wallets ne répondent pas sur iPhone). */
function withTimeout(p: Promise<unknown> | undefined, ms = 2500) {
  return Promise.race([Promise.resolve(p).catch(() => undefined), new Promise((r) => setTimeout(r, ms))]);
}

/** Efface du téléphone les traces de connexion (wallet choisi, jetons Google / e-mail de Privy). */
function clearLocalSession() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k === "walletName" || k === "te_demo" || k.startsWith("privy:") || k.startsWith("privy-")) localStorage.removeItem(k);
    }
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("privy")) sessionStorage.removeItem(k);
  } catch {
    /* stockage indisponible */
  }
}

/** Déconnexion complète : compte Google / e-mail, wallet et session Tiers-État, puis retour à l'écran de connexion. */
function useLogoutAll(privyLogout: (() => Promise<void>) | null) {
  const { disconnect } = useWallet();
  const { signOut } = useSession();
  return async () => {
    if (privyLogout) await withTimeout(privyLogout());
    await withTimeout(disconnect());
    await withTimeout(signOut());
    clearLocalSession();
    window.location.replace("/");
  };
}

function Buttons({ logout, compact }: { logout: () => Promise<void>; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    await logout();
  };
  if (compact)
    return (
      <button type="button" onClick={run} disabled={busy} className="chip shrink-0 px-3 py-1.5 text-xs disabled:opacity-50">
        {busy ? "Déconnexion…" : "Déconnexion"}
      </button>
    );
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={run} disabled={busy} className="btn-ghost w-full">
        Changer de compte
      </button>
      <button type="button" onClick={run} disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-vente/40 bg-vente/10 px-6 font-bold text-vente transition hover:bg-vente/20 disabled:opacity-50">
        {busy ? "Déconnexion…" : "Se déconnecter"}
      </button>
    </div>
  );
}

function WithPrivy({ compact }: { compact?: boolean }) {
  const { logout } = usePrivy();
  return <Buttons logout={useLogoutAll(logout)} compact={compact} />;
}
function WithoutPrivy({ compact }: { compact?: boolean }) {
  return <Buttons logout={useLogoutAll(null)} compact={compact} />;
}

/** `compact` : un seul petit bouton « Déconnexion » (en-tête du profil). */
export function LogoutButtons({ compact }: { compact?: boolean }) {
  return PRIVY_APP_ID ? <WithPrivy compact={compact} /> : <WithoutPrivy compact={compact} />;
}
