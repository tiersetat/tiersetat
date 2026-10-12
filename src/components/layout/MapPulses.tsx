"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedItem } from "@/lib/feed";
import { nightLevel, pulsePoint, type MapView, type Variant } from "@/lib/france-map";
import { subscribeTrades } from "@/components/social/tradesFeed";

type Pulse = { id: string; x: number; y: number; side: "buy" | "sell" };


function parisHour(): number {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

/**
 * Les ondes de « La France qui trade » : uniquement pour de vrais achats et ventes (aucune fausse activité).
 * Chaque échange nouveau fait partir une onde de la capitale du pays du trader (vue France : ville de son clan régional) ;
 * un trader hors de la zone affichée ne fait pas d'onde.
 * La carte est aussi plus lumineuse la nuit (heure de Paris) qu'en journée.
 */
export function MapPulses({ view, variant }: { view: MapView; variant: Variant }) {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [night, setNight] = useState(1);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const tick = () => setNight(nightLevel(parisHour()));
    Promise.resolve().then(tick);
    const id = setInterval(tick, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Une seule carte écoute les échanges : celle qui est affichée (téléphone sous 640 px, ordinateur au-dessus)
    if (window.matchMedia("(min-width: 640px)").matches !== (variant === "d")) return;
    let stop = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const onItems = (items: FeedItem[]) => {
      const trades = items.filter((i): i is Extract<FeedItem, { kind: "trade" }> => i.kind === "trade");
      // Premier passage : on retient l'historique sans l'animer (seuls les échanges qui arrivent ensuite font une onde)
      if (!seen.current) {
        seen.current = new Set(trades.map((t) => t.id));
        return;
      }
      const fresh = trades.filter((t) => !seen.current!.has(t.id)).slice(0, 8);
      fresh.forEach((t) => seen.current!.add(t.id));
      fresh.forEach((t, k) => {
        const p = pulsePoint(view, variant, t.author);
        if (!p) return;
        // Léger décalage pour que plusieurs achats d'une même région ne se superposent pas
        const jitter = (n: number) => ((parseInt(t.id.slice(-n - 2, -n) || "0", 36) % 9) - 4) * 0.35;
        timers.push(
          setTimeout(() => {
            if (stop) return;
            const pulse: Pulse = { id: t.id, x: p[0] + jitter(1), y: p[1] + jitter(3), side: t.side };
            setPulses((cur) => [...cur.slice(-11), pulse]);
            timers.push(setTimeout(() => setPulses((cur) => cur.filter((q) => q.id !== pulse.id)), 3200));
          }, k * 700),
        );
      });
    };
    const unsubscribe = subscribeTrades(onItems);
    return () => {
      stop = true;
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [view, variant]);

  return (
    <>
      {/* Journée : la carte s'apaise (voile plus dense) ; nuit : pleine lumière */}
      <div className="absolute inset-0 bg-nuit transition-opacity duration-[3000ms]" style={{ opacity: (1 - night) * 0.9 }} />
      {pulses.map((p) => (
        <span
          key={p.id}
          className={`map-pulse absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${p.side === "buy" ? "map-pulse-buy" : "map-pulse-sell"}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        />
      ))}
    </>
  );
}
