"use client";

import { useState } from "react";
import { CLUSTER } from "@/lib/solana/config";

const PRESETS = [10, 100, 500, 1000];
const DEVNET = (CLUSTER as string) === "devnet";

/** Achat / vente en dollars, façon appli de trading. Branché sur le cash au lancement réel (réseau principal). */
export function BuyPanel({ symbol }: { symbol: string }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  return (
    <div className="surface space-y-4 p-5">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-white/[0.06] p-1 text-sm font-extrabold" role="group" aria-label="Acheter ou vendre">
        <button type="button" onClick={() => setSide("buy")} aria-pressed={side === "buy"} className={`rounded-full py-2 ${side === "buy" ? "bg-achat text-nuit" : "text-muted-foreground"}`}>
          Acheter
        </button>
        <button type="button" onClick={() => setSide("sell")} aria-pressed={side === "sell"} className={`rounded-full py-2 ${side === "sell" ? "bg-vente text-white" : "text-muted-foreground"}`}>
          Vendre
        </button>
      </div>
      <label className="block">
        <span className="sr-only">Montant en dollars</span>
        <div className="flex items-center rounded-2xl border border-white/12 bg-[#0e1136] px-4">
          <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-muted-foreground">$</span>
          <input
            id="buy-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            placeholder="Saisis le montant"
            className="w-full bg-transparent px-2 py-4 font-[family-name:var(--font-display)] text-3xl font-extrabold outline-none placeholder:text-base placeholder:font-semibold placeholder:text-muted-foreground/60"
          />
        </div>
      </label>
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setAmount(String(p))} className="chip justify-center px-2">
            ${p}
          </button>
        ))}
      </div>
      <button type="button" disabled className={`${side === "buy" ? "btn-buy" : "btn-sell"} w-full`}>
        {side === "buy" ? `Acheter ${symbol}` : `Vendre ${symbol}`}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        {DEVNET
          ? "Pendant la bêta, seuls les mèmes Tiers-État s'échangent (argent fictif). L'achat de tous les tokens Solana avec ton cash arrive au lancement réel."
          : "Bientôt disponible."}
      </p>
    </div>
  );
}
