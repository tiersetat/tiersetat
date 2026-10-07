"use client";

import { useEffect, useState } from "react";
import { formatEur } from "@/lib/eur";
import { CLUSTER } from "@/lib/solana/config";

let shared: Promise<number | null> | null = null;
let sharedAt = 0;

/** Cours SOL/EUR partagé par tous les composants de la page (une requête par minute). */
function loadSolEur(): Promise<number | null> {
  if (!shared || Date.now() - sharedAt > 60_000) {
    sharedAt = Date.now();
    shared = fetch("/api/prix")
      .then((r) => r.json())
      .then((j: { solEur: number | null }) => j.solEur)
      .catch(() => null);
  }
  return shared;
}

export function useSolEur(): number | null {
  const [solEur, setSolEur] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadSolEur().then((v) => !cancelled && setSolEur(v));
    return () => {
      cancelled = true;
    };
  }, []);
  return solEur;
}

/** Équivalent en euros d'un montant en SOL (mention « fictifs » sur le devnet). */
export function Eur({ sol, className = "text-xs text-muted-foreground" }: { sol: number; className?: string }) {
  const solEur = useSolEur();
  if (solEur === null || !Number.isFinite(sol)) return null;
  return (
    <span className={className} title={CLUSTER === "devnet" ? "Au cours réel du SOL. Sur le devnet, les tokens n'ont aucune valeur." : "Au cours actuel du SOL"}>
      {formatEur(sol, solEur, CLUSTER === "devnet")}
    </span>
  );
}
