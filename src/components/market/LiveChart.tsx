"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PositionForm } from "./PositionForm";
import { BacktestPanel } from "./BacktestPanel";
import type { BacktestResult, Candle } from "@/lib/backtest";
import { checkPlan, pnlPct, type Plan } from "@/lib/position-plan";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  type ISeriesMarkersPluginApi,
  HistogramSeries,
  LineSeries,
  TickMarkType,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type MouseEventParams,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import { intervalsOf, LABELS, loadBars, pollMs, remembered, subscribeBars, type Bar, type ChartSource, type Interval, type LiveMode } from "@/lib/chart-feeds";

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

/** Prix lisible quelle que soit sa taille : 2 décimales au-dessus de 1, sinon 4 chiffres significatifs (0.00003312). */
const fmt = (n: number) => (Math.abs(n) >= 1 || n === 0 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : n.toLocaleString("en-US", { maximumSignificantDigits: 4 }));

/** Graduations de l'axe du temps à l'heure locale : heure pour les petites durées, jour, mois ou année au-delà. */
function localTick(t: Time, type: TickMarkType): string {
  const d = new Date((t as number) * 1000);
  if (type === TickMarkType.Year) return String(d.getFullYear());
  if (type === TickMarkType.Month) return d.toLocaleDateString("fr-FR", { month: "short" });
  if (type === TickMarkType.DayOfMonth) return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Décimales de l'axe des prix selon l'ordre de grandeur (un memecoin à 0.00003 $ ne doit pas s'afficher « 0.00 »). */
function priceFormat(data: Bar[]) {
  const ref = data.length ? Math.abs(data[data.length - 1].close) : 1;
  const precision = ref >= 1000 ? 2 : ref >= 1 ? 4 : Math.min(14, Math.ceil(-Math.log10(ref || 1e-9)) + 3);
  return { type: "price" as const, precision, minMove: 10 ** -precision };
}
const SECONDS: Record<Interval, number> = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };

/** Légende du direct : ce qui fait bouger le graphique. */
const LIVE_LABEL: Record<LiveMode, string> = { transactions: "En direct · chaque transaction", direct: "En direct", prix: "À jour" };


/**
 * Graphique en temps réel avec ses outils : type (bougies, ligne, aire), indicateurs (volume, moyennes mobiles,
 * Bollinger), dessin (ligne horizontale, ligne de tendance), plein écran et capture.
 * `source` : Hyperliquid (actions, cryptos), GeckoTerminal (memecoins), CoinGecko (autres cryptos) ou nos échanges (mèmes Tiers-État).
 */
export function LiveChart({
  source,
  unit = "$",
  height = 360,
  defaultInterval,
  liveValue,
}: {
  source: ChartSource;
  unit?: string;
  height?: number;
  defaultInterval?: Interval;
  /** Dernière valeur connue en direct (mèmes Tiers-État : capitalisation lue sur la blockchain), appliquée à la bougie en cours */
  liveValue?: number | null;
}) {
  const intervals = intervalsOf(source);
  const [interval, setIntervalKey] = useState<Interval>(
    defaultInterval && intervals.includes(defaultInterval) ? defaultInterval : intervals.includes("15m") ? "15m" : intervals[0],
  );
  const [kind, setKind] = useState<Kind>("bougies");
  const [indics, setIndics] = useState<Set<Indic>>(new Set(["volume"]));
  const [tool, setTool] = useState<Tool>(null);
  const [live, setLive] = useState(false);
  const [liveMode, setLiveMode] = useState<LiveMode>("prix");
  const [legend, setLegend] = useState<Bar | null>(null);
  const [full, setFull] = useState(false);
  const [limited, setLimited] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  // Outil « position » (comme TradingView) : gardé par actif sur cet appareil
  const planKey = `te_plan:${source.kind === "local" ? `local:${source.createdAt ?? ""}` : JSON.stringify(source)}`;
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  // Backtest : panneau, bougies figées au lancement, marqueurs d'entrée et de sortie
  const [btOpen, setBtOpen] = useState(false);
  const [btCandles, setBtCandles] = useState<Candle[]>([]);
  const [bt, setBt] = useState<BacktestResult | null>(null);
  const markers = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const planRef = useRef<Plan | null>(null);
  const planLines = useRef<IPriceLine[]>([]);
  const riskBox = useRef<HTMLDivElement>(null);
  const rewardBox = useRef<HTMLDivElement>(null);
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
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(255,255,255,0.1)", rightOffset: 4, tickMarkFormatter: localTick },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      crosshair: { horzLine: { color: "rgba(255,255,255,0.35)" }, vertLine: { color: "rgba(255,255,255,0.35)" } },
      // Heures affichées dans le fuseau du visiteur (par défaut, la bibliothèque affiche l'heure universelle)
      localization: { locale: "fr-FR", timeFormatter: (t: Time) => new Date((t as number) * 1000).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) },
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

  /** Lignes de la position (entrée, stop, objectifs) sur la série principale. */
  const drawPlan = useCallback(() => {
    const m = main.current;
    if (!m) return;
    for (const l of planLines.current) {
      try {
        m.removePriceLine(l);
      } catch {
        /* ligne d'une ancienne série */
      }
    }
    planLines.current = [];
    const p = planRef.current;
    if (!p) return;
    const add = (price: number, color: string, title: string, style = 0) => planLines.current.push(m.createPriceLine({ price, color, lineWidth: 2, lineStyle: style, axisLabelVisible: true, title }));
    add(p.entry, "#f4f1fa", p.side === "long" ? "Long" : "Short");
    add(p.stop, "#ff3d68", "Stop");
    add(p.target, "#3dffb0", "Objectif");
    if (p.partial) add(p.partial, "#8fa2ff", "Partiel", 2);
  }, []);

  // Dessine la série principale et les indicateurs à partir des barres
  const render = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const s of extras.current) chart.removeSeries(s);
    extras.current = [];
    if (main.current) chart.removeSeries(main.current);
    const data = bars.current;
    const pf = priceFormat(data);
    if (kind === "bougies") {
      const s = chart.addSeries(CandlestickSeries, { upColor: UP, borderUpColor: UP, wickUpColor: UP, downColor: DOWN, borderDownColor: DOWN, wickDownColor: DOWN, priceFormat: pf });
      s.setData(data);
      main.current = s;
    } else if (kind === "ligne") {
      const s = chart.addSeries(LineSeries, { color: "#ffffff", lineWidth: 2, priceFormat: pf });
      s.setData(data.map((b) => ({ time: b.time, value: b.close })));
      main.current = s;
    } else {
      const s = chart.addSeries(AreaSeries, { lineColor: "#8fa2ff", topColor: "rgba(143,162,255,0.4)", bottomColor: "rgba(143,162,255,0)", lineWidth: 2, priceFormat: pf });
      s.setData(data.map((b) => ({ time: b.time, value: b.close })));
      main.current = s;
    }
    // les dessins sont attachés à l'ancienne série : on les retire (la position, elle, est redessinée)
    drawings.current.lines = [];
    planLines.current = [];
    drawPlan();
    if (indics.has("volume")) {
      const v = chart.addSeries(HistogramSeries, { priceScaleId: "", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      v.setData(data.map((b) => ({ time: b.time, value: b.volume, color: b.close >= b.open ? "rgba(61,255,176,0.35)" : "rgba(255,61,104,0.35)" })));
      extras.current.push(v);
    }
    const line = (pts: { time: UTCTimestamp; value: number }[], color: string) => {
      const s = chart.addSeries(LineSeries, { color, lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, priceFormat: pf });
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
  }, [kind, indics, drawPlan]);

  useEffect(() => {
    render();
  }, [render]);

  // Position enregistrée pour cet actif (relue à l'ouverture)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(planKey) ?? "null") as Plan | null;
      if (saved && checkPlan(saved).ok) Promise.resolve().then(() => setPlan(saved));
    } catch {
      /* stockage indisponible */
    }
  }, [planKey]);
  useEffect(() => {
    planRef.current = plan;
    drawPlan();
  }, [plan, drawPlan]);

  // Boîtes rouge (risque) et verte (gain), recalées à chaque image sur l'échelle de prix du graphique
  useEffect(() => {
    if (!plan) return;
    let raf = 0;
    const place = () => {
      const m = main.current;
      const chart = chartRef.current;
      const r = riskBox.current;
      const g = rewardBox.current;
      if (m && chart && r && g && box.current) {
        const yE = m.priceToCoordinate(plan.entry);
        const yS = m.priceToCoordinate(plan.stop);
        const yT = m.priceToCoordinate(plan.target);
        const scale = chart.priceScale("right").width();
        const w = box.current.clientWidth - scale;
        const left = Math.round(w * 0.55);
        const setBox = (el: HTMLDivElement, a: number | null, b: number | null) => {
          if (a === null || b === null) return void (el.style.display = "none");
          el.style.display = "block";
          el.style.left = `${left}px`;
          el.style.width = `${Math.max(0, w - left)}px`;
          el.style.top = `${Math.min(a, b)}px`;
          el.style.height = `${Math.abs(b - a)}px`;
        };
        setBox(r, yE, yS);
        setBox(g, yE, yT);
      }
      raf = requestAnimationFrame(place);
    };
    raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [plan]);

  // Marqueurs du backtest (flèches d'entrée et de sortie) sur la série principale
  const drawMarkers = useCallback(() => {
    markers.current?.detach();
    markers.current = null;
    if (!bt || !main.current) return;
    const list = bt.trades.flatMap((t) => [
      { time: t.entryTime as UTCTimestamp, position: t.side === "long" ? ("belowBar" as const) : ("aboveBar" as const), color: t.side === "long" ? "#3dffb0" : "#ff3d68", shape: t.side === "long" ? ("arrowUp" as const) : ("arrowDown" as const), text: t.side === "long" ? "Achat" : "Vente" },
      { time: t.exitTime as UTCTimestamp, position: t.side === "long" ? ("aboveBar" as const) : ("belowBar" as const), color: "#d9ccff", shape: "circle" as const, text: `${t.pnlPct >= 0 ? "+" : ""}${t.pnlPct.toFixed(1)} %` },
    ]);
    list.sort((a, b) => (a.time as number) - (b.time as number));
    markers.current = createSeriesMarkers(main.current, list);
  }, [bt]);
  useEffect(() => {
    drawMarkers();
  }, [drawMarkers, kind, indics]);

  const applyPlan = (p: Plan | null) => {
    setPlan(p);
    setPlanOpen(false);
    try {
      if (p) localStorage.setItem(planKey, JSON.stringify(p));
      else localStorage.removeItem(planKey);
    } catch {
      /* stockage indisponible : la position vaut pour cette visite */
    }
  };

  // Historique, puis temps réel (flux en direct ou actualisation régulière)
  const sourceKey = source.kind === "local" ? `local:${source.trades.length}:${source.trades[source.trades.length - 1]?.signature ?? ""}` : JSON.stringify(source);
  // Le cadrage automatique n'a lieu qu'à l'ouverture et au changement de durée : un nouvel échange ne remet pas le zoom à zéro
  const viewKey = `${source.kind === "local" ? `local:${source.createdAt ?? ""}` : JSON.stringify(source)}:${interval}`;
  const fitted = useRef("");
  const kindRef = useRef(kind);
  const indicsRef = useRef(indics);
  useEffect(() => {
    kindRef.current = kind;
    indicsRef.current = indics;
  }, [kind, indics]);
  useEffect(() => {
    let stop = false;
    const apply = (b: Bar) => {
      const list = bars.current;
      if (list.length && list[list.length - 1].time === b.time) list[list.length - 1] = b;
      else if (!list.length || b.time > list[list.length - 1].time) list.push(b);
      else return;
      if (!main.current) return;
      // Le prix a changé d'ordre de grandeur (token qui s'envole ou s'effondre) : l'axe garde le bon nombre de décimales
      const pf = priceFormat(list);
      if (pf.precision !== (main.current.options().priceFormat as { precision?: number }).precision) main.current.applyOptions({ priceFormat: pf });
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
      if (fitted.current !== viewKey && list.length) {
        chartRef.current?.timeScale().fitContent();
        fitted.current = viewKey;
      }
      setLegend(list[list.length - 1] ?? null);
    };
    const load = () =>
      loadBars(source, interval)
        .then((list) => {
          if (stop) return;
          attempt = 0;
          setLimited(false);
          // Les bougies en direct plus récentes que l'historique rechargé (en retard) sont gardées : pas de retour en arrière
          const lastLoaded = list[list.length - 1]?.time ?? 0;
          const newer = bars.current.filter((b) => b.time > lastLoaded);
          const merged = newer.length && list.length ? [...list, ...newer] : list;
          // Une réponse vide ne remplace jamais un graphique déjà affiché
          if (merged.length || !bars.current.length) show(merged);
          if (source.kind !== "hyperliquid" && source.kind !== "binance") setLive(list.length > 0);
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
    // Un mème Tiers-État qui reçoit un échange garde ses bougies affichées pendant le recalcul (pas de clignotement)
    if (source.kind !== "local") bars.current = [];
    if (cached) show(cached);
    Promise.resolve().then(() => !stop && setLive(Boolean(cached) && source.kind !== "hyperliquid" && source.kind !== "binance"));
    void load();
    const unsub = subscribeBars(
      source,
      interval,
      apply,
      (on, mode) => {
        if (stop) return;
        setLive(on);
        if (mode) setLiveMode(mode);
      },
      () => bars.current[bars.current.length - 1],
    );
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

  // Valeur en direct (mèmes Tiers-État) : la bougie en cours bouge dès que la blockchain change, avant même l'enregistrement de l'échange
  const applyRef = useRef<(b: Bar) => void>(() => undefined);
  useEffect(() => {
    applyRef.current = (b: Bar) => {
      const list = bars.current;
      if (list.length && list[list.length - 1].time === b.time) list[list.length - 1] = b;
      else if (!list.length || b.time > list[list.length - 1].time) list.push(b);
      else return;
      if (!main.current) return;
      if (kind === "bougies") (main.current as ISeriesApi<"Candlestick">).update(b);
      else (main.current as ISeriesApi<"Line">).update({ time: b.time, value: b.close });
      setLegend(b);
    };
  }, [kind]);
  useEffect(() => {
    if (!liveValue || !Number.isFinite(liveValue) || liveValue <= 0) return;
    const sec = SECONDS[interval];
    const bucket = (Math.floor(Date.now() / 1000 / sec) * sec) as UTCTimestamp;
    const prev = bars.current[bars.current.length - 1];
    if (!prev) return;
    if (prev.time === bucket) applyRef.current({ ...prev, high: Math.max(prev.high, liveValue), low: Math.min(prev.low, liveValue), close: liveValue });
    else if (bucket > prev.time) applyRef.current({ time: bucket, open: prev.close, high: Math.max(prev.close, liveValue), low: Math.min(prev.close, liveValue), close: liveValue, volume: 0 });
  }, [liveValue, interval]);

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
        <button type="button" onClick={() => setPlanOpen((v) => !v)} className={`${btn(planOpen || Boolean(plan))} shrink-0`} title="Placer ta position : entrée, stop et objectif">
          ▤ Position
        </button>
        <button
          type="button"
          onClick={() => {
            if (!btOpen) setBtCandles(bars.current.map((b) => ({ time: b.time as number, open: b.open, high: b.high, low: b.low, close: b.close })));
            setBtOpen((v) => !v);
          }}
          className={`${btn(btOpen || Boolean(bt))} shrink-0`}
          title="Tester une stratégie sur l'historique affiché"
        >
          ⟲ Backtest
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
          {live ? (source.kind === "hyperliquid" || source.kind === "binance" ? LIVE_LABEL.direct : source.kind === "local" ? LIVE_LABEL.transactions : LIVE_LABEL[liveMode]) : "Connexion…"}
        </span>
        {legend && (
          <span className={up ? "text-achat" : "text-vente"}>
            O {fmt(legend.open)} · H {fmt(legend.high)} · B {fmt(legend.low)} · C {fmt(legend.close)} {unit}
          </span>
        )}
        {limited && <span className="font-sans text-white/60">Données très demandées, nouvel essai…</span>}
        {tool && <span className="font-sans font-bold text-soleil">{tool === "horizontale" ? "Touche le graphique pour placer la ligne" : step === 2 ? "Touche le 2e point" : "Touche le 1er point"}</span>}
      </div>

      {plan && (() => {
        const c = checkPlan(plan);
        const last = legend?.close;
        const pnl = last ? pnlPct(plan, last) : null;
        return c.ok ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pb-2 text-[11px]">
            <span className={`rounded-md px-1.5 py-0.5 font-bold ${plan.side === "long" ? "bg-achat/15 text-achat" : "bg-vente/15 text-vente"}`}>{plan.side === "long" ? "Long" : "Short"}</span>
            <span className="text-muted-foreground">
              risque <b className="text-vente">{c.riskPct.toFixed(2)} %</b> · gain visé <b className="text-achat">{c.rewardPct.toFixed(2)} %</b> · ratio <b className="text-foreground">{c.ratio.toFixed(2)} : 1</b>
            </span>
            {pnl !== null && <span className={`font-mono font-bold ${pnl >= 0 ? "text-achat" : "text-vente"}`}>en cours {pnl >= 0 ? "+" : "−"}{Math.abs(pnl).toFixed(2)} %</span>}
          </div>
        ) : null;
      })()}

      <div className={`relative w-full ${full ? "flex-1" : ""}`} style={full ? undefined : { height }}>
        <div ref={box} className={`absolute inset-0 ${tool ? "cursor-crosshair" : ""}`} />
        {plan && (
          <>
            <div ref={riskBox} className="pointer-events-none absolute border border-vente/50 bg-vente/15" style={{ display: "none" }} />
            <div ref={rewardBox} className="pointer-events-none absolute border border-achat/50 bg-achat/12" style={{ display: "none" }} />
          </>
        )}
        {btOpen && (
          <div className="absolute right-2 top-2 z-10 max-h-[calc(100%-1rem)] w-[min(22rem,calc(100%-1rem))] overflow-y-auto">
            <BacktestPanel
              candles={btCandles}
              interval={LABELS[interval]}
              onResult={setBt}
              onClose={() => {
                setBtOpen(false);
                setBt(null);
              }}
            />
          </div>
        )}
        {planOpen && (
          <div className="absolute left-2 top-2 z-10 w-[min(22rem,calc(100%-1rem))]">
            <PositionForm
              initial={plan}
              price={legend?.close ?? null}
              onApply={(p) => applyPlan(p)}
              onClear={() => applyPlan(null)}
              onClose={() => setPlanOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
