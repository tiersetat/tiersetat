"use client";

import { useEffect, useState } from "react";
import { maxPriorityFeeSol, PRIORITY_LEVELS, type PriorityLevel } from "@/lib/solana/priority";

export type TradeSettingsValue = { slippageBps: number; priority: PriorityLevel };

const KEY = "te_trade_settings_v1";
const DEFAULTS: TradeSettingsValue = { slippageBps: 100, priority: "rapide" };
const SLIPPAGES = [50, 100, 200, 500];

/** Réglages de trading mémorisés dans le navigateur (simple confort, valeurs par défaut sinon). */
export function useTradeSettings(): [TradeSettingsValue, (v: TradeSettingsValue) => void] {
  const [value, setValue] = useState<TradeSettingsValue>(DEFAULTS);
  useEffect(() => {
    let stored: TradeSettingsValue | null = null;
    try {
      stored = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      stored = null;
    }
    if (stored && SLIPPAGES.includes(stored.slippageBps) && stored.priority in PRIORITY_LEVELS) {
      const s = stored;
      void Promise.resolve().then(() => setValue(s));
    }
  }, []);
  const update = (v: TradeSettingsValue) => {
    setValue(v);
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      /* navigation privée */
    }
  };
  return [value, update];
}

/** Petit panneau ⚙ : glissement maximal et frais de priorité. */
export function TradeSettings({ value, onChange }: { value: TradeSettingsValue; onChange: (v: TradeSettingsValue) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        ⚙ Glissement {value.slippageBps / 100} % · {PRIORITY_LEVELS[value.priority].label}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 space-y-4 rounded-2xl border border-ligne bg-popover p-4 shadow-xl">
          <div className="space-y-2">
            <p className="label">Glissement maximal</p>
            <div className="grid grid-cols-4 gap-1.5">
              {SLIPPAGES.map((bps) => (
                <button key={bps} type="button" className={`chip text-center ${value.slippageBps === bps ? "chip-active" : ""}`} onClick={() => onChange({ ...value, slippageBps: bps })}>
                  {bps / 100} %
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Si le prix bouge plus que ça pendant ta signature, la transaction est annulée (tu ne perds que les frais réseau).</p>
          </div>
          <div className="space-y-2">
            <p className="label">Frais de priorité</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(PRIORITY_LEVELS) as PriorityLevel[]).map((lvl) => (
                <button key={lvl} type="button" className={`chip text-center ${value.priority === lvl ? "chip-active" : ""}`} onClick={() => onChange({ ...value, priority: lvl })}>
                  {PRIORITY_LEVELS[lvl].label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Passe ta transaction plus vite quand le réseau est chargé. Coût max : {maxPriorityFeeSol(value.priority).toLocaleString("fr-FR", { maximumFractionDigits: 5 })} SOL.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
