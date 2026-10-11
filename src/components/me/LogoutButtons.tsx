"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSession } from "@/components/providers/SessionProvider";
import { PRIVY_APP_ID } from "@/components/providers/PrivyBridge";

/** Déconnexion complète : session Tiers-État, wallet (Phantom, Solflare…) et compte Google / e-mail. */
function useLogoutAll(privyLogout: (() => Promise<void>) | null) {
  const { disconnect } = useWallet();
  const { signOut } = useSession();
  return async () => {
    await signOut().catch(() => undefined);
    await disconnect().catch(() => undefined);
    if (privyLogout) await privyLogout().catch(() => undefined);
    try {
      // évite la reconnexion automatique au même wallet
      localStorage.removeItem("walletName");
    } catch {
      /* stockage indisponible */
    }
    window.location.assign("/");
  };
}

function Buttons({ logout }: { logout: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    await logout();
  };
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

function WithPrivy() {
  const { logout } = usePrivy();
  return <Buttons logout={useLogoutAll(logout)} />;
}
function WithoutPrivy() {
  return <Buttons logout={useLogoutAll(null)} />;
}

export function LogoutButtons() {
  return PRIVY_APP_ID ? <WithPrivy /> : <WithoutPrivy />;
}
