"use client";

import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, ColorType, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";

/** Durées de bougie proposées, et la période chargée pour chacune. */
const INTERVALS = [
  { key: "1m", label: "1 min", lookback: 6 * 3600_000 },
  { key: "5m", label: "5 min", lookback: 2 * 86_400_000 },
  { key: "15m", label: "15 min", lookback: 5 * 86_400_000 },
  { key: "1h", label: "1 h", lookback: 20 * 86_400_000 },
  { key: "4h", label: "4 h", lookback: 80 * 86_400_000 },
  { key: "1d", label: "1 j", lookback: 400 * 86_400_000 },
] as const;
type Interval = (typeof INTERVALS)[number]["key"];
type Raw = { t: number; o: string; h: string; l: string; c: string };

const toBar = (c: Raw) => ({ time: Math.floor(c.t / 1000) as UTCTimestamp, open: +c.o, high: +c.h, low: +c.l, close: +c.c });

/**
 * Graphique en bougies, en temps réel : historique puis mises à jour en direct (websocket Hyperliquid).
 * `coin` : identifiant Hyperliquid, ex. « xyz:TSLA » (actions) ou « BTC » (cryptos).
 */
export function LiveChart({ coin }: { coin: string }) {
  const [interval, setInterval_] = useState<Interval>("15m");
  const [live, setLive] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const chart = createChart(box.current, {
      height: 340,
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#c3c7ea", fontFamily: "var(--font-geist-mono), monospace" },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(255,255,255,0.1)", rightOffset: 4 },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      crosshair: { horzLine: { color: "rgba(255,255,255,0.3)" }, vertLine: { color: "rgba(255,255,255,0.3)" } },
      localization: { locale: "fr-FR" },
    });
    series.current = chart.addSeries(CandlestickSeries, {
      upColor: "#3dffb0",
      borderUpColor: "#3dffb0",
      wickUpColor: "#3dffb0",
      downColor: "#ff3d68",
      borderDownColor: "#ff3d68",
      wickDownColor: "#ff3d68",
    });
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
      series.current = null;
    };
  }, []);

  useEffect(() => {
    let stop = false;
    let ws: WebSocket | null = null;
    const lookback = INTERVALS.find((i) => i.key === interval)!.lookback;
    Promise.resolve().then(() => !stop && setLive(false));
    fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "candleSnapshot", req: { coin, interval, startTime: Date.now() - lookback } }),
    })
      .then((r) => r.json())
      .then((list: Raw[]) => {
        if (stop || !series.current) return;
        const bars = list.map(toBar);
        series.current.setData(bars);
        chartRef.current?.timeScale().fitContent();
        if (bars.length) setLast(bars[bars.length - 1].close);
        // Mises à jour en direct
        ws = new WebSocket("wss://api.hyperliquid.xyz/ws");
        ws.onopen = () => {
          ws?.send(JSON.stringify({ method: "subscribe", subscription: { type: "candle", coin, interval } }));
          setLive(true);
        };
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data as string) as { channel?: string; data?: Raw };
          if (m.channel !== "candle" || !m.data || !series.current) return;
          const bar = toBar(m.data);
          series.current.update(bar);
          setLast(bar.close);
        };
        ws.onclose = () => !stop && setLive(false);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
      ws?.close();
    };
  }, [coin, interval]);

  return (
    <div className="surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
        <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className={`size-2 rounded-full ${live ? "animate-pulse bg-achat" : "bg-muted-foreground"}`} />
          {live ? "En direct" : "Connexion…"}
          {last !== null && <span className="font-mono text-foreground">{last.toLocaleString("en-US", { maximumFractionDigits: last < 1 ? 6 : 2 })} $</span>}
        </p>
        <div className="flex gap-1" role="group" aria-label="Durée des bougies">
          {INTERVALS.map((i) => (
            <button key={i.key} type="button" onClick={() => setInterval_(i.key)} className={`rounded-lg px-2 py-1 text-xs font-bold ${interval === i.key ? "bg-white text-nuit" : "text-muted-foreground hover:text-foreground"}`}>
              {i.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={box} className="h-[340px] w-full" />
    </div>
  );
}
