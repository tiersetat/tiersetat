"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ChartSource } from "@/lib/chart-feeds";

const LiveChart = dynamic(() => import("./LiveChart").then((m) => m.LiveChart), { ssr: false, loading: () => <div className="surface h-[460px] animate-pulse" /> });
const TradingViewChart = dynamic(() => import("./TradingViewChart").then((m) => m.TradingViewChart), { ssr: false, loading: () => <div className="h-[480px] animate-pulse rounded-2xl bg-white/[0.04]" /> });

/**
 * Graphique d'un actif : TradingView (tous les outils) quand il connaît l'actif, sinon notre graphique en direct.
 * On peut basculer de l'un à l'autre.
 */
export function ChartPanel({ source, tvSymbol, unit }: { source: ChartSource; tvSymbol?: string | null; unit?: string }) {
  const [mode, setMode] = useState<"tv" | "direct">(tvSymbol ? "tv" : "direct");
  return (
    <div className="space-y-2">
      {tvSymbol && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("tv")} className={`chip py-1.5 ${mode === "tv" ? "chip-active" : ""}`}>
            TradingView
          </button>
          <button type="button" onClick={() => setMode("direct")} className={`chip py-1.5 ${mode === "direct" ? "chip-active" : ""}`}>
            En direct
          </button>
        </div>
      )}
      {mode === "tv" && tvSymbol ? (
        <div className="surface p-2">
          <TradingViewChart symbol={tvSymbol} />
        </div>
      ) : (
        <LiveChart source={source} unit={unit} />
      )}
    </div>
  );
}
