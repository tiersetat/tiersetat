"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { buildCandles, type TradeRow } from "@/lib/candles";

/** Graphique en bougies de la market cap (SOL), par minute. */
export function PriceChart({ trades }: { trades: TradeRow[] }) {
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
        textColor: "#9b98ad",
        fontFamily: "var(--font-geist-mono), monospace",
      },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(255,255,255,0.09)", barSpacing: 12, rightOffset: 6 },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.09)" },
      localization: { locale: "fr-FR" },
    });
    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#3dffa8",
      borderUpColor: "#3dffa8",
      wickUpColor: "#3dffa8",
      downColor: "#ff3b5c",
      borderDownColor: "#ff3b5c",
      wickDownColor: "#ff3b5c",
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
    const candles = buildCandles(trades).map((c) => ({ ...c, time: c.time as UTCTimestamp }));
    seriesRef.current?.setData(candles);
    // Peu de bougies : largeur fixe plutôt qu'étirées sur tout le graphique
    if (candles.length > 40) chartRef.current?.timeScale().fitContent();
    else chartRef.current?.timeScale().scrollToRealTime();
  }, [trades]);

  return (
    <div className="surface p-3">
      <div className="flex items-center justify-between px-2 pb-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Market cap (SOL)</span>
        <span>1 min</span>
      </div>
      <div ref={container} className="h-80 w-full" />
      {trades.length === 0 && <p className="pb-2 text-center text-sm text-muted-foreground">Aucun échange pour l&apos;instant.</p>}
    </div>
  );
}
