"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ChartSource, Interval } from "@/lib/chart-feeds";

const LiveChart = dynamic(() => import("./LiveChart").then((m) => m.LiveChart), { ssr: false, loading: () => <div className="surface h-[460px] animate-pulse" /> });
const TradingViewChart = dynamic(() => import("./TradingViewChart").then((m) => m.TradingViewChart), { ssr: false, loading: () => <div className="h-full min-h-[520px] animate-pulse rounded-2xl bg-white/[0.04]" /> });

/** Pool d'un memecoin sur un DEX : de quoi intégrer le graphique officiel de DexScreener ou de GeckoTerminal. */
export type ProPool = { chain: string; network: string; pair: string };
type Pro = "dexscreener" | "geckoterminal";

const DS_INTERVAL: Record<Interval, string> = { "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "1D" };

/** Adresse du graphique officiel intégrable (thème sombre, sans les panneaux annexes). */
function proUrl(p: ProPool, pro: Pro, interval: Interval): string {
  if (pro === "dexscreener") {
    return `https://dexscreener.com/${p.chain}/${p.pair}?embed=1&theme=dark&trades=0&info=0&chartTheme=dark&chartStyle=1&chartType=usd&interval=${DS_INTERVAL[interval]}`;
  }
  return `https://www.geckoterminal.com/${p.network}/pools/${p.pair}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0&chart_type=price&resolution=${interval}`;
}

/**
 * Graphique d'un actif. Trois vues :
 *  - « Pro » : le graphique officiel DexScreener (ou GeckoTerminal) intégré, pour les memecoins : chaque transaction, tous les outils ;
 *  - « TradingView » : pour les cryptos et actions qu'il connaît ;
 *  - « En direct » : notre graphique, qui écoute la blockchain ou les plateformes.
 * « Agrandir » ouvre la vue Pro ou TradingView en plein écran (aussi sur iPhone, où le plein écran natif n'existe pas).
 */
export function ChartPanel({
  source,
  tvSymbol,
  unit,
  pro: pool,
  defaultInterval,
}: {
  source: ChartSource;
  tvSymbol?: string | null;
  unit?: string;
  pro?: ProPool | null;
  defaultInterval?: Interval;
}) {
  const [mode, setMode] = useState<"pro" | "tv" | "direct">(pool ? "pro" : tvSymbol ? "tv" : "direct");
  const [pro, setPro] = useState<Pro>("dexscreener");
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

  const embedded = (mode === "pro" && pool) || (mode === "tv" && tvSymbol);
  const title = mode === "pro" ? (pro === "dexscreener" ? "DexScreener" : "GeckoTerminal") : tvSymbol;

  return (
    <div className="space-y-2">
      {(pool || tvSymbol) && (
        <div className="flex flex-wrap items-center gap-2">
          {pool && (
            <button type="button" onClick={() => setMode("pro")} className={`chip py-1.5 ${mode === "pro" ? "chip-active" : ""}`}>
              Graphique pro
            </button>
          )}
          {tvSymbol && (
            <button type="button" onClick={() => setMode("tv")} className={`chip py-1.5 ${mode === "tv" ? "chip-active" : ""}`}>
              TradingView
            </button>
          )}
          <button type="button" onClick={() => setMode("direct")} className={`chip py-1.5 ${mode === "direct" ? "chip-active" : ""}`}>
            En direct
          </button>
          {mode === "pro" && pool && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Source :</span>
              {(["dexscreener", "geckoterminal"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPro(p)} className={`rounded-lg px-2 py-1 font-bold transition ${pro === p ? "bg-white/15 text-foreground" : "hover:text-foreground"}`}>
                  {p === "dexscreener" ? "DexScreener" : "GeckoTerminal"}
                </button>
              ))}
            </span>
          )}
          {embedded && (
            <button type="button" onClick={() => setBig(true)} className="chip ml-auto gap-1.5 py-1.5" aria-label="Agrandir le graphique">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
              Agrandir
            </button>
          )}
        </div>
      )}
      {embedded ? (
        <div
          className={
            big
              ? "fixed inset-0 z-[90] flex flex-col bg-nuit/95 p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
              : "surface overflow-hidden p-2"
          }
        >
          {big && (
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="font-bold">{title}</p>
              <button type="button" onClick={() => setBig(false)} className="chip py-1.5">
                Réduire ✕
              </button>
            </div>
          )}
          <div className={big ? "min-h-0 flex-1" : "h-[68vh] min-h-[520px] lg:h-[620px]"}>
            {mode === "pro" && pool ? (
              <iframe
                key={`${pro}:${pool.pair}`}
                src={proUrl(pool, pro, defaultInterval ?? "15m")}
                title={`Graphique ${title}`}
                className="size-full rounded-xl border-0 bg-[#131722]"
                allow="clipboard-write; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <TradingViewChart symbol={tvSymbol!} />
            )}
          </div>
        </div>
      ) : (
        <LiveChart source={source} unit={unit} defaultInterval={defaultInterval} />
      )}
    </div>
  );
}
