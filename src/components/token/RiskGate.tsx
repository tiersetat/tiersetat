"use client";

import Link from "next/link";
import { useState } from "react";

// v2 : ajout de la confirmation d'âge (18 ans) et de l'acceptation des CGU
const KEY = "te_risk_ack_v2";

export function hasAcceptedRisk(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Avertissement obligatoire avant le premier achat ou la première création : risques, âge et CGU. */
export function RiskGate({ onAccept, onCancel, title = "Avant ton premier achat" }: { onAccept: () => void; onCancel: () => void; title?: string }) {
  const [risk, setRisk] = useState(false);
  const [adult, setAdult] = useState(false);
  const checked = risk && adult;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="risk-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-ligne bg-popover p-6 shadow-[0_30px_80px_-20px_rgba(140,147,201,0.35)]">
        <h2 id="risk-title" className="text-xl font-semibold">{title}</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Un memecoin n&apos;a aucune valeur garantie : son prix peut tomber à zéro en quelques minutes.</li>
          <li>Ce n&apos;est ni un placement, ni un conseil financier, ni une monnaie ayant cours légal.</li>
          <li>N&apos;engage que ce que tu es prêt à perdre entièrement.</li>
        </ul>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-vente/40 bg-vente/[0.07] p-3 text-sm font-medium">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--vente)]" checked={risk} onChange={(e) => setRisk(e.target.checked)} />
          Les memecoins sont spéculatifs, je peux tout perdre.
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ligne bg-white/[0.03] p-3 text-sm font-medium">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--pervenche)]" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
          <span>
            J&apos;ai 18 ans ou plus et j&apos;accepte les{" "}
            <Link href="/cgu" target="_blank" className="underline underline-offset-2">
              conditions d&apos;utilisation
            </Link>
            .
          </span>
        </label>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost flex-1">
            Annuler
          </button>
          <button
            type="button"
            disabled={!checked}
            onClick={() => {
              try {
                localStorage.setItem(KEY, "1");
              } catch {
                /* navigation privée : on redemandera la prochaine fois */
              }
              onAccept();
            }}
            className="btn-primary flex-1"
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
