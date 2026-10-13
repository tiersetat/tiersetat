"use client";

import { useState } from "react";
import { checkPlan, defaultPlan, type Plan, type Side } from "@/lib/position-plan";

const num = (s: string) => Number(s.replace(",", ".").trim());
const str = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "" : String(Number(n.toPrecision(6))));

/** Petit formulaire de l'outil « position » : long ou short, entrée, stop, objectif, objectif partiel. */
export function PositionForm({ initial, price, onApply, onClear, onClose }: { initial: Plan | null; price: number | null; onApply: (p: Plan) => void; onClear: () => void; onClose: () => void }) {
  const start = initial ?? (price ? defaultPlan("long", price) : null);
  const [side, setSide] = useState<Side>(start?.side ?? "long");
  const [entry, setEntry] = useState(str(start?.entry));
  const [stop, setStop] = useState(str(start?.stop));
  const [target, setTarget] = useState(str(start?.target));
  const [partial, setPartial] = useState(str(start?.partial));
  const plan: Plan = { side, entry: num(entry), stop: num(stop), target: num(target), partial: partial.trim() ? num(partial) : null };
  const check = checkPlan(plan);

  const flip = (s: Side) => {
    setSide(s);
    // On repart d'un plan cohérent autour de l'entrée (ou du prix actuel) quand on change de sens
    const base = num(entry) || price;
    if (base) {
      const d = defaultPlan(s, base);
      setStop(str(d.stop));
      setTarget(str(d.target));
      setPartial("");
    }
  };
  const field = (label: string, v: string, set: (s: string) => void, hint?: string) => (
    <label className="block space-y-1">
      <span className="flex justify-between text-[11px] font-semibold text-muted-foreground">
        {label}
        {hint && <span className="font-normal">{hint}</span>}
      </span>
      <input value={v} onChange={(e) => set(e.target.value)} inputMode="decimal" className="field py-2 font-mono text-sm" />
    </label>
  );

  return (
    <div className="space-y-3 rounded-2xl border border-white/12 bg-[#0b0f2e]/95 p-4 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold">Ma position</p>
        <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Fermer
        </button>
      </div>
      <div className="flex rounded-full bg-black/25 p-1 text-sm font-bold" role="group" aria-label="Sens">
        {(["long", "short"] as Side[]).map((s) => (
          <button key={s} type="button" onClick={() => flip(s)} aria-pressed={side === s} className={`flex-1 rounded-full px-3 py-1.5 ${side === s ? (s === "long" ? "bg-achat text-nuit" : "bg-vente text-white") : "text-white/75"}`}>
            {s === "long" ? "Long (achat)" : "Short (vente)"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {field("Entrée", entry, setEntry)}
        {field("Stop", stop, setStop)}
        {field("Objectif", target, setTarget)}
        {field("Objectif partiel", partial, setPartial, "optionnel")}
      </div>
      {check.ok ? (
        <p className="text-xs text-muted-foreground">
          Risque <b className="text-vente">{check.riskPct.toFixed(2)} %</b> · gain visé <b className="text-achat">{check.rewardPct.toFixed(2)} %</b> · ratio <b className="text-foreground">{check.ratio.toFixed(2)} : 1</b>
        </p>
      ) : (
        <p className="text-xs text-vente">{check.reason}</p>
      )}
      <div className="flex gap-2">
        <button type="button" disabled={!check.ok} onClick={() => onApply(plan)} className="btn-primary min-h-0 flex-1 py-2 text-sm">
          Afficher sur le graphique
        </button>
        {initial && (
          <button type="button" onClick={onClear} className="btn-ghost min-h-0 px-4 py-2 text-sm">
            Retirer
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">Outil de visualisation : aucun ordre n&apos;est passé. Pas un conseil financier.</p>
    </div>
  );
}
