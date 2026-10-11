"use client";

import { memo, useEffect, useRef } from "react";

/**
 * Graphique officiel TradingView (widget gratuit) avec tous ses outils : dessin, indicateurs, échelles, plein écran.
 * `symbol` : symbole TradingView, ex. « NASDAQ:TSLA », « TVC:GOLD », « FX:EURUSD », « BINANCE:BTCUSDT ».
 */
function TradingViewChartInner({ symbol }: { symbol: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "15",
      timezone: "Europe/Paris",
      theme: "dark",
      style: "1",
      locale: "fr",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(255, 255, 255, 0.05)",
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      allow_symbol_change: false,
      withdateranges: true,
      save_image: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, [symbol]);
  return <div ref={box} className="tradingview-widget-container h-full w-full overflow-hidden rounded-2xl" />;
}

export const TradingViewChart = memo(TradingViewChartInner);
