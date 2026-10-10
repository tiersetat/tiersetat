"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CandlestickSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { buildCandles, changeSinceLaunch, defaultInterval, INTERVALS, type TradeRow } from "@/lib/candles";

/** Graphique en bougies de la capitalisation (SOL) : départ au lancement, durée réglable, variation en grand. */
export function PriceChart({ trades, createdAt }: { trades: TradeRow[]; createdAt?: string }) {
  const launchAt = createdAt ? Date.parse(createdAt) : undefined;
  const [bucket, setBucket] = useState(() => (launchAt ? defaultInterval(Date.now() - launchAt) : 60));
  const candles = useMemo(() => buildCandles(trades, bucket, launchAt), [trades, bucket, launchAt]);
  const change = changeSinceLaunch(candles);
  const last = candles[candles.length - 1]?.close ?? null;
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const chart = createChart(container.current, {
      height: 320,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a7acd9",
        fontFamily: "var(--font-geist-mono), monospace",
      },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(255,255,255,0.09)", barSpacing: 12, rightOffset: 6 },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.09)" },
      localization: { locale: "fr-FR" },
    });
    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#3dffb0",
      borderUpColor: "#3dffb0",
      wickUpColor: "#3dffb0",
      downColor: "#ff3d68",
      borderDownColor: "#ff3d68",
      wickDownColor: "#ff3d68",
      priceFormat: { type: "price", precision: 3, minMove: 0.001 },
    });
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    seriesRef.current?.setData(candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })));
    // Peu de bougies : largeur fixe plutôt qu'étirées sur tout le graphique
    if (candles.length > 40) chartRef.current?.timeScale().fitContent();
    else chartRef.current?.timeScale().scrollToRealTime();
  }, [candles]);

  return (
    <div className="surface p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-3">
        <div>
          <p className="text-xs text-muted-foreground">Capitalisation</p>
          <p className="font-mono text-2xl font-bold leading-tight sm:text-3xl">
            {last === null ? "—" : `${last.toLocaleString("fr-FR", { maximumFractionDigits: last < 10 ? 2 : 1 })} SOL`}
          </p>
          {change !== null && (
            <p className={`font-mono text-sm font-semibold ${change >= 0 ? "text-achat" : "text-vente"}`}>
              {change >= 0 ? "+" : ""}
              {change.toLocaleString("fr-FR", { maximumFractionDigits: Math.abs(change) < 10 ? 1 : 0 })} % depuis le lancement
            </p>
          )}
        </div>
        <div className="flex gap-1 rounded-full bg-white/[0.05] p-1" role="group" aria-label="Durée des bougies">
          {INTERVALS.map((i) => (
            <button
              key={i.seconds}
              type="button"
              onClick={() => setBucket(i.seconds)}
              aria-pressed={bucket === i.seconds}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${bucket === i.seconds ? "bg-electrique text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={container} className="h-80 w-full" />
      {trades.length === 0 && <p className="pb-2 text-center text-sm text-muted-foreground">Aucun échange pour l&apos;instant : la courbe démarre au prix de lancement.</p>}
    </div>
  );
}
