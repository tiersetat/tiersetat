"use client";

import { useEffect, useState } from "react";
import { DETTE, detteAt } from "@/lib/dette";

const eur = (n: number) => `${Math.floor(n).toLocaleString("fr-FR")} €`;

/** Compteur qui grimpe en temps réel, plus la somme ajoutée depuis l'arrivée sur la page. */
export function DebtCounter() {
  const [now, setNow] = useState<number | null>(null);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    };
    Promise.resolve().then(() => {
      setArrivedAt(start);
      tick();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Rendu serveur : chiffre arrondi stable, remplacé dès l'hydratation
  const total = now === null ? DETTE.baseEur : detteAt(now);
  const sinceArrival = now !== null && arrivedAt !== null ? ((now - arrivedAt) / 1000) * DETTE.eurPerSecond : 0;

  return (
    <div className="space-y-8">
      <p className="whitespace-nowrap font-mono text-[1.7rem] font-semibold tabular-nums tracking-tight text-vente sm:text-6xl lg:text-7xl" aria-live="off">
        {eur(total)}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Par habitant</p>
          <p className="mt-2 font-mono text-2xl tabular-nums">{eur(total / DETTE.population)}</p>
          <p className="mt-1 text-xs text-muted-foreground">bébés compris, ils n&apos;ont rien demandé</p>
        </div>
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Chaque seconde</p>
          <p className="mt-2 font-mono text-2xl tabular-nums">+{eur(DETTE.eurPerSecond)}</p>
          <p className="mt-1 text-xs text-muted-foreground">environ 6 SMIC nets… par seconde</p>
        </div>
        <div className="surface border-vente/30 p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Depuis que tu es là</p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-vente">+{eur(sinceArrival)}</p>
          <p className="mt-1 text-xs text-muted-foreground">merci de ta visite</p>
        </div>
      </div>
    </div>
  );
}
