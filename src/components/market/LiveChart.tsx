"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import { intervalsOf, LABELS, loadBars, pollMs, remembered, subscribeBars, type Bar, type ChartSource, type Interval } from "@/lib/chart-feeds";

type Kind = "bougies" | "ligne" | "aire";
type Tool = null | "horizontale" | "tendance";

const UP = "#3dffb0";
const DOWN = "#ff3d68";

/** Indicateurs (calculs purs) */
function sma(bars: Bar[], n: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  let sum = 0;
  bars.forEach((b, i) => {
    sum += b.close;
    if (i >= n) sum -= bars[i - n].close;
    if (i >= n - 1) out.push({ time: b.time, value: sum / n });
  });
  return out;
}
function bollinger(bars: Bar[], n = 20, k = 2) {
  const up: { time: UTCTimestamp; value: number }[] = [];
  const lo: { time: UTCTimestamp; value: number }[] = [];
  for (let i = n - 1; i < bars.length; i++) {
    const w = bars.slice(i - n + 1, i + 1).map((b) => b.close);
    const m = w.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / n);
    up.push({ time: bars[i].time, value: m + k * sd });
    lo.push({ time: bars[i].time, value: m - k * sd });
  }
  return { up, lo };
}

type Indic = "volume" | "mm20" | "mm50" | "bollinger";
const INDICS: { key: Indic; label: string; color: string }[] = [
  { key: "volume", label: "Volume", color: "#8fa2ff" },
  { key: "mm20", label: "MM 20", color: "#ffd23f" },
  { key: "mm50", label: "MM 50", color: "#ff7ad9" },
  { key: "bollinger", label: "Bollinger", color: "#5ec8ff" },
];

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 2 });

/**
 * Graphique en temps réel avec ses outils : type (bougies, ligne, aire), indicateurs (volume, moyennes mobiles,
 * Bollinger), dessin (ligne horizontale, ligne de tendance), plein écran et capture.
 * `source` : Hyperliquid (actions, cryptos), GeckoTerminal (memecoins), CoinGecko (autres cryptos) ou nos échanges (mèmes Tiers-État).
 */
export function LiveChart({ source, unit = "$", height = 360 }: { source: ChartSource; unit?: string; height?: number }) {
  const intervals = intervalsOf(source);
  const [interval, setIntervalKey] = useState<Interval>(intervals.includes("15m") ? "15m" : intervals[0]);
  const [kind, setKind] = useState<Kind>("bougies");
  const [indics, setIndics] = useState<Set<Indic>>(new Set(["volume"]));
  const [tool, setTool] = useState<Tool>(null);
  const [live, setLive] = useState(false);
  const [legend, setLegend] = useState<Bar | null>(null);
  const [full, setFull] = useState(false);
  const [limited, setLimited] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const main = useRef<ISeriesApi<SeriesType> | null>(null);
  const extras = useRef<ISeriesApi<SeriesType>[]>([]);
  const drawings = useRef<{ lines: IPriceLine[]; trends: ISeriesApi<"Line">[] }>({ lines: [], trends: [] });
  const bars = useRef<Bar[]>([]);
  const pending = useRef<{ time: Time; value: number } | null>(null);
  const toolRef = useRef<Tool>(null);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // Création du graphique
  useEffect(() => {
    if (!box.current) return;
    const chart = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#c3c7ea", fontFamily: "var(--font-geist-mono), monospace" },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(255,255,255,0.1)", rightOffset: 4 },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      crosshair: { horzLine: { color: "rgba(255,255,255,0.35)" }, vertLine: { color: "rgba(255,255,255,0.35)" } },
      localization: { locale: "fr-FR" },
    });
    chartRef.current = chart;
    const onMove = (p: MouseEventParams) => {
      const d = p.time ? bars.current.find((b) => b.time === p.time) : undefined;
      setLegend(d ?? bars.current[bars.current.length - 1] ?? null);
    };
    const onClick = (p: MouseEventParams) => {
      const t = toolRef.current;
      if (!t || !p.point || !main.current) return;
      const price = main.current.coordinateToPrice(p.point.y);
      if (price === null) return;
      if (t === "horizontale") {
        drawings.current.lines.push(main.current.createPriceLine({ price, color: "#ffd23f", lineWidth: 1, lineStyle: 2, axisLabelVisible: true }));
        setTool(null);
      } else if (t === "tendance" && p.time) {
        if (!pending.current) {
          pending.current = { time: p.time, value: price };
          setStep(2);
        } else {
          const a = pending.current;
          const b = { time: p.time, value: price };
          const pts = [a, b].sort((x, y) => (x.time as number) - (y.time as number));
          if (pts[0].time !== pts[1].time) {
            const s = chart.addSeries(LineSeries, { color: "#ffd23f", lineWidth: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
            s.setData(pts);
            drawings.current.trends.push(s);
          }
          pending.current = null;
          setStep(1);
          setTool(null);
        }
      }
    };
    chart.subscribeCrosshairMove(onMove);
    chart.subscribeClick(onClick);
    return () => {
      chart.remove();
      chartRef.current = null;
      main.current = null;
      extras.current = [];
      drawings.current = { lines: [], trends: [] };
    };
  }, []);

  // Dessine la série principale et les indicateurs à partir des barres
  const render = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const s of extras.current) chart.removeSeries(s);
    extras.current = [];
    if (main.current) chart.removeSeries(main.current);
    const data = bars.current;
    if (kind === "bougies") {
      const s = chart.addSeries(CandlestickSeries, { upColor: UP, borderUpColor: UP, wickUpColor: UP, downColor: DOWN, borderDownColor: DOWN, wickDownColor: DOWN });
      s.setData(data);
      main.current = s;
    } else if (kind === "ligne") {
      const s = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 2 });
      s.setData(data.map((b) => ({ time: b.time, value: b.close })));
      main.current = s;
    } else {
      const s = chart.addSeries(AreaSeries, { lineColor: "#8fa2ff", topColor: "rgba(143,162,255,0.4)", bottomColor: "rgba(143,162,255,0)", lineWidth: 2 });
      s.setData(data.map((b) => ({ time: b.time, value: b.close })));
      main.current = s;
    }
    // les dessins sont attachés à l'ancienne série : on les retire
    drawings.current.lines = [];
    if (indics.has("volume")) {
      const v = chart.addSeries(HistogramSeries, { priceScaleId: "", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      v.setData(data.map((b) => ({ time: b.time, value: b.volume, color: b.close >= b.open ? "rgba(61,255,176,0.35)" : "rgba(255,61,104,0.35)" })));
      extras.current.push(v);
    }
    const line = (pts: { time: UTCTimestamp; value: number }[], color: string) => {
      const s = chart.addSeries(LineSeries, { color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
      s.setData(pts);
      extras.current.push(s);
    };
    if (indics.has("mm20")) line(sma(data, 20), "#ffd23f");
    if (indics.has("mm50")) line(sma(data, 50), "#ff7ad9");
    if (indics.has("bollinger")) {
      const b = bollinger(data);
      line(b.up, "#5ec8ff");
      line(b.lo, "#5ec8ff");
    }
  }, [kind, indics]);

  useEffect(() => {
    render();
  }, [render]);

  // Historique, puis temps réel (flux en direct ou actualisation régulière)
  const sourceKey = source.kind === "local" ? `local:${source.trades.length}:${source.trades[source.trades.length - 1]?.signature ?? ""}` : JSON.stringify(source);
  const kindRef = useRef(kind);
  const indicsRef = useRef(indics);
  useEffect(() => {
    kindRef.current = kind;
    indicsRef.current = indics;
  }, [kind, indics]);
  useEffect(() => {
    let stop = false;
    let first = true;
    const apply = (b: Bar) => {
      const list = bars.current;
      if (list.length && list[list.length - 1].time === b.time) list[list.length - 1] = b;
      else if (!list.length || b.time > list[list.length - 1].time) list.push(b);
      else return;
      if (!main.current) return;
      if (kindRef.current === "bougies") (main.current as ISeriesApi<"Candlestick">).update(b);
      else (main.current as ISeriesApi<"Line">).update({ time: b.time, value: b.close });
      const vol = indicsRef.current.has("volume") ? (extras.current[0] as ISeriesApi<"Histogram"> | undefined) : undefined;
      vol?.update({ time: b.time, value: b.volume, color: b.close >= b.open ? "rgba(61,255,176,0.35)" : "rgba(255,61,104,0.35)" });
      setLegend(b);
    };
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    const show = (list: Bar[]) => {
      bars.current = list;
      render();
      if (first) chartRef.current?.timeScale().fitContent();
      first = false;
      setLegend(list[list.length - 1] ?? null);
    };
    const load = () =>
      loadBars(source, interval)
        .then((list) => {
          if (stop) return;
          attempt = 0;
          setLimited(false);
          // Une réponse vide ne remplace jamais un graphique déjà affiché
          if (list.length || !bars.current.length) show(list);
          if (source.kind !== "hyperliquid") setLive(list.length > 0);
        })
        .catch(() => {
          if (stop) return;
          // Service momentanément limité : on garde le graphique affiché et on réessaie
          setLimited(true);
          if (!bars.current.length && attempt < 5) {
            attempt++;
            retry = setTimeout(load, 1500 * 2 ** attempt);
          }
        });
    // Affichage immédiat de ce qui est en mémoire
    const cached = remembered(source, interval);
    bars.current = [];
    if (cached) show(cached);
    Promise.resolve().then(() => !stop && setLive(Boolean(cached) && source.kind !== "hyperliquid"));
    void load();
    const unsub = subscribeBars(source, interval, apply, (on) => !stop && setLive(on));
    const every = pollMs(source);
    const timer = every ? setInterval(load, every) : null;
    return () => {
      stop = true;
      unsub();
      if (timer) clearInterval(timer);
      if (retry) clearTimeout(retry);
    };
    // la source est suivie par sa clé (sourceKey) ; le rendu suit kind/indics via render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, interval]);

  const clearDrawings = () => {
    const chart = chartRef.current;
    for (const l of drawings.current.lines) main.current?.removePriceLine(l);
    for (const s of drawings.current.trends) chart?.removeSeries(s);
    drawings.current = { lines: [], trends: [] };
    pending.current = null;
    setStep(1);
    setTool(null);
  };
  const toggleIndic = (k: Indic) =>
    setIndics((cur) => {
      const n = new Set(cur);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrap.current?.requestFullscreen();
    } catch {
      /* plein écran indisponible : agrandissement dans la page */
    }
    setFull((f) => !f);
  };
  const capture = () => {
    const canvas = chartRef.current?.takeScreenshot();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `tiers-etat-graphique.png`;
    a.click();
  };

  const btn = (on: boolean) => `rounded-lg px-2 py-1 text-xs font-bold transition ${on ? "bg-white text-nuit" : "text-muted-foreground hover:bg-white/10 hover:text-foreground"}`;
  const up = legend ? legend.close >= legend.open : true;

  return (
    <div ref={wrap} className={`surface flex flex-col p-3 sm:p-4 ${full ? "fixed inset-0 z-[70] rounded-none bg-nuit" : ""}`}>
      {/* Barre d'outils */}
      <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-2">
        {intervals.map((i) => (
          <button key={i} type="button" onClick={() => setIntervalKey(i)} className={btn(interval === i)}>
            {LABELS[i]}
          </button>
        ))}
        <span className="mx-1 h-4 w-px shrink-0 bg-white/15" />
        {(
          [
            ["bougies", "Bougies"],
            ["ligne", "Ligne"],
            ["aire", "Aire"],
          ] as [Kind, string][]
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={btn(kind === k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-3">
        {INDICS.map((i) => (
          <button key={i.key} type="button" onClick={() => toggleIndic(i.key)} className={`${btn(indics.has(i.key))} flex shrink-0 items-center gap-1`}>
            <span className="size-1.5 rounded-full" style={{ background: i.color }} />
            {i.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px shrink-0 bg-white/15" />
        <button type="button" onClick={() => setTool(tool === "horizontale" ? null : "horizontale")} className={`${btn(tool === "horizontale")} shrink-0`} title="Clique sur le graphique pour placer une ligne de prix">
          ― Ligne de prix
        </button>
        <button type="button" onClick={() => setTool(tool === "tendance" ? null : "tendance")} className={`${btn(tool === "tendance")} shrink-0`} title="Clique deux points sur le graphique">
          ╱ Tendance
        </button>
        <button type="button" onClick={clearDrawings} className={`${btn(false)} shrink-0`}>
          Effacer
        </button>
        <span className="mx-1 h-4 w-px shrink-0 bg-white/15" />
        <button type="button" onClick={capture} className={`${btn(false)} shrink-0`} title="Enregistrer une image du graphique">
          📷
        </button>
        <button type="button" onClick={toggleFull} className={`${btn(full)} shrink-0`} title="Plein écran">
          ⛶
        </button>
      </div>

      {/* Légende : ouverture, haut, bas, clôture */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pb-2 font-mono text-[11px]">
        <span className="flex items-center gap-1.5 font-bold text-muted-foreground">
          <span className={`size-2 rounded-full ${live ? "animate-pulse bg-achat" : "bg-muted-foreground"}`} />
          {live ? (source.kind === "hyperliquid" ? "En direct" : "À jour") : "Connexion…"}
        </span>
        {legend && (
          <span className={up ? "text-achat" : "text-vente"}>
            O {fmt(legend.open)} · H {fmt(legend.high)} · B {fmt(legend.low)} · C {fmt(legend.close)} {unit}
          </span>
        )}
        {limited && <span className="font-sans text-white/60">Données très demandées, nouvel essai…</span>}
        {tool && <span className="font-sans font-bold text-soleil">{tool === "horizontale" ? "Touche le graphique pour placer la ligne" : step === 2 ? "Touche le 2e point" : "Touche le 1er point"}</span>}
      </div>

      <div ref={box} style={full ? undefined : { height }} className={`w-full ${full ? "flex-1" : ""} ${tool ? "cursor-crosshair" : ""}`} />
    </div>
  );
}
