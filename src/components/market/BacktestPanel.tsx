"use client";

import { useState } from "react";
import { backtest, STRATEGIES, type BacktestResult, type Candle, type Mode, type Strategy } from "@/lib/backtest";

const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

/** Backtest d'une stratégie simple sur les bougies affichées ; renvoie les trades pour les marquer sur le graphique. */
export function BacktestPanel({ candles, interval, onResult, onClose }: { candles: Candle[]; interval: string; onResult: (r: BacktestResult | null) => void; onClose: () => void }) {
  const [strategy, setStrategy] = useState<Strategy>("croisement");
  const [mode, setMode] = useState<Mode>("long");
  const [fee, setFee] = useState("0.1");
  const [res, setRes] = useState<BacktestResult | null>(null);
  const run = () => {
    const r = backtest(candles, strategy, mode, Number(fee.replace(",", ".")) || 0);
    setRes(r);
    onResult(r);
  };
  const info = STRATEGIES.find((s) => s.key === strategy)!;
  const better = res ? res.totalPct > res.holdPct : false;

  return (
    <div className="space-y-3 rounded-2xl border border-white/12 bg-[#0b0f2e]/95 p-4 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold">Backtest</p>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Fermer
        </button>
      </div>
      <div className="flex flex-col gap-1.5" role="group" aria-label="Stratégie">
        {STRATEGIES.map((s) => (
          <button key={s.key} type="button" onClick={() => setStrategy(s.key)} aria-pressed={strategy === s.key} className={`rounded-xl px-3 py-2 text-left text-sm font-bold ${strategy === s.key ? "bg-white/12 text-white ring-1 ring-pervenche/50" : "text-muted-foreground hover:bg-white/[0.05]"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{info.explication}</p>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-full bg-black/25 p-1 text-xs font-bold" role="group" aria-label="Sens">
          {(
            [
              ["long", "Achat seul"],
              ["longshort", "Achat et vente"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} className={`flex-1 rounded-full px-2 py-1.5 ${mode === k ? "bg-white text-nuit" : "text-white/75"}`}>
              {l}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Frais
          <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" className="field w-14 px-2 py-1 text-right font-mono text-xs" />%
        </label>
      </div>
      <button type="button" onClick={run} disabled={candles.length < 60} className="btn-primary min-h-0 w-full py-2 text-sm">
        {candles.length < 60 ? "Pas assez d'historique" : `Lancer sur ${candles.length} bougies (${interval})`}
      </button>
      {res && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/[0.05] p-2.5">
              <p className="text-[11px] text-muted-foreground">Stratégie</p>
              <p className={`font-mono text-lg font-extrabold ${res.totalPct >= 0 ? "text-achat" : "text-vente"}`}>{pct(res.totalPct)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2.5">
              <p className="text-[11px] text-muted-foreground">Garder du début à la fin</p>
              <p className={`font-mono text-lg font-extrabold ${res.holdPct >= 0 ? "text-achat" : "text-vente"}`}>{pct(res.holdPct)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {res.trades.length} trade{res.trades.length > 1 ? "s" : ""} · gagnants {res.winRate === null ? "—" : `${Math.round(res.winRate)} %`} · pire baisse −{res.maxDrawdownPct.toFixed(1)} % · investi {Math.round(res.exposurePct)} % du temps
          </p>
          <p className={`text-xs font-bold ${better ? "text-achat" : "text-muted-foreground"}`}>
            {better ? "Sur cette période, la stratégie a fait mieux que garder." : "Sur cette période, garder a fait aussi bien ou mieux."}
          </p>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Simulation sur l&apos;historique affiché : entrée à l&apos;ouverture de la bougie suivant le signal, frais inclus, sans levier. Les performances passées ne prédisent pas l&apos;avenir. Pas un conseil financier.
      </p>
    </div>
  );
}
