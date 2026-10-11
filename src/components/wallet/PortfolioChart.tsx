"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, createChart, LineSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { gainOver, windowPoints, WINDOWS, type Point, type Window } from "@/lib/portfolio-history";

const UP = "#3dffb0";
const DOWN = "#ff3d68";
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Courbe de la valeur du portefeuille : verte quand elle monte, rouge quand elle baisse, avec les gains par période. */
export function PortfolioChart({ points, now }: { points: Point[]; now: number }) {
  const [w, setW] = useState<Window>("total");
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const line = useRef<ISeriesApi<"Line"> | null>(null);
  const shown = useMemo(() => windowPoints(points, w, now), [points, w, now]);
  const gains = useMemo(() => Object.fromEntries(WINDOWS.map((x) => [x.key, gainOver(points, x.key, now)])), [points, now]);
  const g = gains[w];

  useEffect(() => {
    if (!box.current) return;
    const c = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "rgba(255,255,255,0.55)", fontFamily: "var(--font-geist-mono), monospace", attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false, borderVisible: false },
      crosshair: { horzLine: { visible: false, labelVisible: false }, vertLine: { color: "rgba(255,255,255,0.3)", labelVisible: false } },
      handleScroll: false,
      handleScale: false,
    });
    line.current = c.addSeries(LineSeries, { lineWidth: 3, priceLineVisible: false, lastValueVisible: false, crosshairMarkerRadius: 5 });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
      line.current = null;
    };
  }, []);

  useEffect(() => {
    if (!line.current) return;
    // Chaque segment prend la couleur de sa direction : vert si la valeur monte, rouge si elle baisse
    const seen = new Set<number>();
    const data = shown
      .map((p, i) => ({ time: Math.floor(p.t / 1000) as UTCTimestamp, value: p.v, color: i === 0 || p.v >= shown[i - 1].v ? UP : DOWN }))
      .filter((d) => (seen.has(d.time) ? false : (seen.add(d.time), true)));
    line.current.setData(data);
    chart.current?.timeScale().fitContent();
  }, [shown]);

  const up = (g?.usd ?? 0) >= 0;
  return (
    <div className="space-y-3">
      {g && (
        <p className={`flex items-center gap-2 font-mono text-sm font-bold ${up ? "text-achat" : "text-vente"}`}>
          <span>{up ? "▲" : "▼"}</span>
          <span>
            {up ? "+" : "−"}
            {money(Math.abs(g.usd))}
          </span>
          {g.pct !== null && <span className="text-white/60">({Math.abs(g.pct).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %)</span>}
          <span className="font-sans font-semibold text-white/50">{w === "total" ? "depuis le début" : `sur ${WINDOWS.find((x) => x.key === w)!.label}`}</span>
        </p>
      )}
      <div ref={box} className="h-44 w-full" />
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Période">
        {WINDOWS.map((x) => {
          const gx = gains[x.key];
          const pos = (gx?.usd ?? 0) >= 0;
          return (
            <button key={x.key} type="button" onClick={() => setW(x.key)} className={`chip flex-col justify-center gap-0.5 px-2 py-2 ${w === x.key ? "chip-active" : ""}`}>
              <span className="text-xs">{x.label}</span>
              {gx && (
                <span className={`font-mono text-[11px] ${pos ? "text-achat" : "text-vente"}`}>
                  {pos ? "+" : "−"}
                  {Math.abs(gx.usd) >= 1000 ? `${(Math.abs(gx.usd) / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k$` : money(Math.abs(gx.usd))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
