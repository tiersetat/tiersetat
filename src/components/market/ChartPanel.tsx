"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ChartSource } from "@/lib/chart-feeds";

const LiveChart = dynamic(() => import("./LiveChart").then((m) => m.LiveChart), { ssr: false, loading: () => <div className="surface h-[460px] animate-pulse" /> });
const TradingViewChart = dynamic(() => import("./TradingViewChart").then((m) => m.TradingViewChart), { ssr: false, loading: () => <div className="h-full min-h-[520px] animate-pulse rounded-2xl bg-white/[0.04]" /> });

/**
 * Graphique d'un actif : TradingView (tous les outils) quand il connaît l'actif, sinon notre graphique en direct.
 * « Agrandir » ouvre TradingView en plein écran (aussi sur iPhone, où le plein écran natif n'existe pas).
 */
export function ChartPanel({ source, tvSymbol, unit }: { source: ChartSource; tvSymbol?: string | null; unit?: string }) {
  const [mode, setMode] = useState<"tv" | "direct">(tvSymbol ? "tv" : "direct");
  const [big, setBig] = useState(false);

  // Plein écran : la page derrière ne défile plus, et « Échap » referme
  useEffect(() => {
    if (!big) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBig(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [big]);

  return (
    <div className="space-y-2">
      {tvSymbol && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMode("tv")} className={`chip py-1.5 ${mode === "tv" ? "chip-active" : ""}`}>
            TradingView
          </button>
          <button type="button" onClick={() => setMode("direct")} className={`chip py-1.5 ${mode === "direct" ? "chip-active" : ""}`}>
            En direct
          </button>
          {mode === "tv" && (
            <button type="button" onClick={() => setBig(true)} className="chip ml-auto gap-1.5 py-1.5" aria-label="Agrandir le graphique">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
              Agrandir
            </button>
          )}
        </div>
      )}
      {mode === "tv" && tvSymbol ? (
        <div
          className={
            big
              ? "fixed inset-0 z-[90] flex flex-col bg-nuit/95 p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
              : "surface p-2"
          }
        >
          {big && (
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="font-bold">{tvSymbol}</p>
              <button type="button" onClick={() => setBig(false)} className="chip py-1.5">
                Réduire ✕
              </button>
            </div>
          )}
          <div className={big ? "min-h-0 flex-1" : "h-[68vh] min-h-[520px] lg:h-[620px]"}>
            <TradingViewChart symbol={tvSymbol} />
          </div>
        </div>
      ) : (
        <LiveChart source={source} unit={unit} />
      )}
    </div>
  );
}
