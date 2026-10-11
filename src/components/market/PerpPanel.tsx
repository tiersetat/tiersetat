"use client";

import { useState } from "react";

const PRESETS = [10, 100, 500, 1000];

/** Long / short avec effet de levier (Hyperliquid). Branché au lancement réel, avec le feu vert juridique. */
export function PerpPanel({ symbol, maxLeverage }: { symbol: string; maxLeverage: number }) {
  const [side, setSide] = useState<"long" | "short">("long");
  const [amount, setAmount] = useState("");
  const levels = [1, 2, 5, 10, 20, 25, 50].filter((l) => l <= maxLeverage);
  const [lev, setLev] = useState(Math.min(10, maxLeverage));
  const size = Number(amount.replace(",", ".")) * lev;
  return (
    <div className="space-y-4 rounded-3xl bg-surface p-5 ring-1 ring-white/[0.08]">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-white/[0.06] p-1 text-sm font-extrabold" role="group" aria-label="Sens">
        <button type="button" onClick={() => setSide("long")} aria-pressed={side === "long"} className={`rounded-full py-2 ${side === "long" ? "bg-achat text-nuit" : "text-muted-foreground"}`}>
          Long ▲
        </button>
        <button type="button" onClick={() => setSide("short")} aria-pressed={side === "short"} className={`rounded-full py-2 ${side === "short" ? "bg-vente text-white" : "text-muted-foreground"}`}>
          Short ▼
        </button>
      </div>
      <div className="flex items-center rounded-2xl border border-white/12 bg-[#0e1136] px-4">
        <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-muted-foreground">$</span>
        <input
          id="perp-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
          inputMode="decimal"
          placeholder="Mise"
          aria-label="Mise en dollars"
          className="w-full bg-transparent px-2 py-4 font-[family-name:var(--font-display)] text-3xl font-extrabold outline-none placeholder:text-base placeholder:font-semibold placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setAmount(String(p))} className="chip justify-center px-2">
            ${p}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Effet de levier</span>
          <span className="font-extrabold text-soleil">×{lev}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {levels.map((l) => (
            <button key={l} type="button" onClick={() => setLev(l)} className={`chip px-3 py-1.5 ${lev === l ? "chip-active" : ""}`}>
              ×{l}
            </button>
          ))}
        </div>
      </div>
      {size > 0 && (
        <p className="text-sm text-muted-foreground">
          Position de <strong className="text-foreground">${size.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong> sur {symbol}.
        </p>
      )}
      <button type="button" disabled className={`${side === "long" ? "btn-buy" : "btn-sell"} w-full`}>
        {side === "long" ? `Long ${symbol} ×${lev}` : `Short ${symbol} ×${lev}`}
      </button>
      <p className="text-center text-xs text-muted-foreground">Alimenté par Hyperliquid. L&apos;ouverture de positions arrive au lancement.</p>
    </div>
  );
}
