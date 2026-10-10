"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Bubble = { id: string; mint: string; who: string; side: "buy" | "sell"; sol: number; ticker: string; image: string | null };

const KEY = "te_live_off";
const GAP_MS = 6000;
const SHOW_MS = 4500;

/**
 * Bulles d'activité en direct : uniquement de vrais échanges (Supabase Realtime),
 * au plus une toutes les 6 secondes, désactivables par le visiteur.
 */
export function LiveTrades() {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [off, setOff] = useState(true);
  const lastShown = useRef(0);

  useEffect(() => {
    let disabled = false;
    try {
      disabled = localStorage.getItem(KEY) === "1";
    } catch {
      /* stockage indisponible : bulles actives */
    }
    Promise.resolve().then(() => setOff(disabled));
    const supabase = supabaseBrowser();
    if (disabled || !supabase) return;

    const channel = supabase
      .channel("bulles-activite")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trades" }, async ({ new: row }) => {
        const t = row as { signature: string; mint: string; trader_wallet: string; side: "buy" | "sell"; sol_amount: number };
        if (Date.now() - lastShown.current < GAP_MS) return;
        lastShown.current = Date.now();
        const [{ data: token }, { data: profile }] = await Promise.all([
          supabase.from("tokens").select("ticker, image_url").eq("mint", t.mint).maybeSingle(),
          supabase.from("profiles").select("pseudo").eq("wallet", t.trader_wallet).maybeSingle(),
        ]);
        if (!token) return; // mème masqué ou inconnu : rien à montrer
        setBubble({
          id: t.signature,
          mint: t.mint,
          who: profile?.pseudo ?? `${t.trader_wallet.slice(0, 4)}…${t.trader_wallet.slice(-4)}`,
          side: t.side,
          sol: Number(t.sol_amount),
          ticker: token.ticker,
          image: token.image_url,
        });
        setTimeout(() => setBubble((b) => (b?.id === t.signature ? null : b)), SHOW_MS);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (off || !bubble) return null;
  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-40 max-w-[calc(100vw-1.5rem)] duration-300 lg:bottom-6 lg:left-[17rem]">
      <div className="flex items-center gap-3 rounded-2xl border border-ligne bg-popover py-2 pr-2 pl-2 shadow-2xl">
        {bubble.image && (
          // eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème
          <img src={bubble.image} alt="" className="size-9 rounded-xl object-cover" />
        )}
        <Link href={`/token/${bubble.mint}`} className="min-w-0 text-sm">
          <span className="font-medium">{bubble.who}</span>{" "}
          <span className={bubble.side === "buy" ? "text-achat" : "text-vente"}>{bubble.side === "buy" ? "vient d'acheter" : "vient de vendre"}</span>{" "}
          <span className="font-mono">{bubble.sol.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} SOL</span> de <span className="font-mono text-pervenche">${bubble.ticker}</span>
        </Link>
        <button
          type="button"
          aria-label="Ne plus afficher l'activité en direct"
          title="Ne plus afficher"
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* stockage indisponible */
            }
            setOff(true);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
