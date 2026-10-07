"use client";

import { useEffect, useState } from "react";
import { DETTE, detteAt } from "@/lib/dette";

/** Chiffre de la dette qui grimpe en continu (version compacte pour l'accueil). */
export function DebtLive({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    Promise.resolve().then(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <span className={`tabular-nums ${className}`}>{Math.floor(now === null ? DETTE.baseEur : detteAt(now)).toLocaleString("fr-FR")} €</span>;
}
