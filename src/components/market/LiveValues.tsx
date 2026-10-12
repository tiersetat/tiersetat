"use client";

import { livePrice, pct, usd } from "@/lib/market-format";
import { liveKeyOf, useLiveQuote } from "./livePrices";
import type { MarketItem } from "./MarketRow";

/** Prix, capitalisation et variation 24 h d'une ligne de liste, en direct quand une source existe. */
export function LiveRowValues({ t }: { t: MarketItem }) {
  const q = useLiveQuote(liveKeyOf(t));
  const price = q?.price ?? t.priceUsd;
  // Capitalisation : celle de la source en direct, sinon recalculée au prorata du prix
  const mcap = q?.mcap ?? (q && t.mcapUsd !== null && t.priceUsd ? (t.mcapUsd * q.price) / t.priceUsd : t.mcapUsd);
  const change = q?.change24 ?? t.change24;
  const up = (change ?? 0) >= 0;
  return (
    <>
      <div className="shrink-0 text-right">
        <p key={q?.at} className={`font-mono text-sm font-bold ${q?.dir === "up" ? "flash-up" : q?.dir === "down" ? "flash-down" : ""}`}>
          {livePrice(price)}
        </p>
        {mcap !== null && <p className="font-mono text-xs text-muted-foreground">{usd(mcap)} cap.</p>}
      </div>
      {t.progress !== undefined ? (
        <span className="w-[5.5rem] shrink-0 rounded-xl bg-soleil/15 px-2 py-1.5 text-center font-mono text-xs font-bold text-soleil" title="Progression vers la Bastille">
          🏰 {Math.round(t.progress)} %
        </span>
      ) : (
        <span
          className={`w-[5.5rem] shrink-0 rounded-xl px-2 py-1.5 text-center font-mono text-xs font-bold ${change === null ? "bg-white/[0.06] text-muted-foreground" : up ? "bg-achat/15 text-achat" : "bg-vente/15 text-vente"}`}
        >
          {pct(change)}
        </span>
      )}
    </>
  );
}

/** Variante compacte pour les cartes et tableaux : renvoie les valeurs en direct (ou celles de la page). */
export function useLiveItem(t: MarketItem) {
  const q = useLiveQuote(liveKeyOf(t));
  return { price: q?.price ?? t.priceUsd, change24: q?.change24 ?? t.change24, dir: q?.dir ?? null, at: q?.at };
}
