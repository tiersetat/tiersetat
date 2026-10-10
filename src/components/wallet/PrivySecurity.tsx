"use client";

import { useMfaEnrollment, usePrivy } from "@privy-io/react-auth";
import { useExportWallet } from "@privy-io/react-auth/solana";
import { useState } from "react";

/**
 * Sécurité du wallet intégré (connexion par e-mail / Google) :
 * double authentification et export de la clé, affichée par Privy sur un domaine séparé
 * (Tiers-État ne voit jamais la clé).
 */
export function PrivySecurity({ address }: { address: string }) {
  const { user } = usePrivy();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const { exportWallet } = useExportWallet();
  const [error, setError] = useState<string | null>(null);
  const mfa = (user?.mfaMethods?.length ?? 0) > 0;

  const run = (fn: () => Promise<void> | void) => async () => {
    setError(null);
    try {
      await fn();
    } catch {
      setError("L'opération n'a pas abouti. Réessaie dans un instant.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.05] p-4">
        <div>
          <p className="font-semibold">Double authentification</p>
          <p className="text-sm text-muted-foreground">
            {mfa ? "Activée : un code ou Face ID est demandé pour les opérations sensibles." : "Ajoute un code (appli d'authentification) ou une passkey Face ID / empreinte."}
          </p>
        </div>
        {mfa ? (
          <span className="rounded-full bg-achat px-3 py-1 text-xs font-extrabold text-nuit">Activée</span>
        ) : (
          <button type="button" onClick={run(() => showMfaEnrollmentModal())} className="btn-fete min-h-10 px-4 py-2 text-sm">
            Activer
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.05] p-4">
        <div>
          <p className="font-semibold">Exporter ma clé</p>
          <p className="text-sm text-muted-foreground">Pour retrouver ton wallet dans Phantom ou Solflare. Ne la montre jamais à personne, pas même à nous.</p>
        </div>
        <button type="button" onClick={run(() => exportWallet({ address }))} className="btn-ghost min-h-10 px-4 py-2 text-sm">
          Exporter
        </button>
      </div>
      {error && <p className="text-sm text-vente">{error}</p>}
    </div>
  );
}
