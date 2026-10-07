"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { explorerUrl } from "@/lib/solana/config";
import { MIGRATION_QUOTE_THRESHOLD_LAMPORTS } from "@/lib/solana/platform";
import type { TradeRow } from "@/lib/candles";
import { Eur } from "@/components/Eur";
import { MigrationPanel } from "./MigrationPanel";
import { TradePanel } from "./TradePanel";

// Le graphique manipule le DOM : rendu côté navigateur uniquement.
const PriceChart = dynamic(() => import("./PriceChart").then((m) => m.PriceChart), {
  ssr: false,
  loading: () => <div className="surface h-[380px]" />,
});

type Live = { market_cap_sol: number; curve_progress: number; migrated: boolean };

const THRESHOLD_SOL = Number(MIGRATION_QUOTE_THRESHOLD_LAMPORTS) / 1e9;
const fmt = (n: number, max = 2) => n.toLocaleString("fr-FR", { maximumFractionDigits: max });

/** Partie vivante de la page token : graphique, progression, achat/vente, historique (temps réel). */
export function TokenLive(props: {
  mint: string;
  pool: string;
  ticker: string;
  initialTrades: TradeRow[];
  initial: Live;
  /** Rappels affichés juste avant un achat (indicateurs de risque) */
  warnings?: string[];
  /** Contenu rendu côté serveur sous le panneau d'achat (bouclier anti-arnaque) */
  sidebar?: React.ReactNode;
  /** Contenu affiché sous l'historique (discussion) */
  below?: React.ReactNode;
}) {
  const { mint, pool, ticker } = props;
  const [trades, setTrades] = useState(props.initialTrades);
  const [live, setLive] = useState(props.initial);

  const reload = useCallback(async () => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    const [{ data: t }, { data: tok }] = await Promise.all([
      supabase.from("trades").select("*").eq("mint", mint).order("block_time", { ascending: true }).limit(2000),
      supabase.from("tokens").select("market_cap_sol, curve_progress, migrated").eq("mint", mint).maybeSingle(),
    ]);
    if (t) setTrades(t as TradeRow[]);
    if (tok) setLive(tok as Live);
  }, [mint]);

  // Rattrapage des trades faits hors du site (les nouveaux arrivent ensuite par le temps réel)
  useEffect(() => {
    void fetch("/api/trades/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mint }) }).catch(() => undefined);
  }, [mint]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    const channel = supabase
      .channel(`token-${mint}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trades", filter: `mint=eq.${mint}` }, ({ new: row }) =>
        setTrades((list) => (list.some((t) => t.signature === (row as TradeRow).signature) ? list : [...list, row as TradeRow])),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tokens", filter: `mint=eq.${mint}` }, ({ new: row }) =>
        setLive((l) => ({ ...l, ...(row as Live) })),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mint]);

  const progress = Number(live.curve_progress);
  const raised = (progress / 100) * THRESHOLD_SOL;
  const recent = [...trades].reverse().slice(0, 50);
  const volume = trades.reduce((s, t) => s + Number(t.sol_amount), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        <dl className="grid grid-cols-3 divide-x divide-ligne rounded-2xl border border-ligne bg-white/[0.02]">
          {[
            { label: "Market cap", value: `${fmt(Number(live.market_cap_sol))} SOL`, sol: Number(live.market_cap_sol) },
            { label: "Volume", value: `${fmt(volume, 3)} SOL`, sol: volume },
            { label: "Échanges", value: fmt(trades.length, 0), sol: null },
          ].map((s) => (
            <div key={s.label} className="px-4 py-4">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 font-mono text-lg font-medium">{s.value}</dd>
              {s.sol !== null && <Eur sol={s.sol} className="text-[11px] text-muted-foreground/80" />}
            </div>
          ))}
        </dl>

        <PriceChart trades={trades} />

        <section className="surface space-y-3 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Bonding curve</h2>
            <span className="font-mono text-sm">{fmt(progress, 1)} %</span>
          </div>
          <div className="progress-track h-2.5">
            <div className="progress-fill" style={{ width: `${Math.max(Math.min(100, progress), 1)}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {live.migrated
              ? "Courbe remplie : le token a migré sur Meteora DAMM v2."
              : `${fmt(raised, 3)} SOL sur ${fmt(THRESHOLD_SOL, 2)} SOL. À 100 %, le token migre automatiquement sur un DEX et sa liquidité est verrouillée.`}
          </p>
        </section>

        <section className="surface overflow-hidden">
          <h2 className="border-b border-ligne px-5 py-4 font-semibold">Historique des échanges</h2>
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Aucun échange pour l&apos;instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Compte</th>
                    <th className="px-2 py-2.5 font-medium">Type</th>
                    <th className="px-2 py-2.5 text-right font-medium">SOL</th>
                    <th className="px-2 py-2.5 text-right font-medium">${ticker}</th>
                    <th className="px-5 py-2.5 text-right font-medium">Heure</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {recent.map((t) => (
                    <tr key={t.signature} className="border-t border-ligne">
                      <td className="px-5 py-2.5">
                        <Link href={`/profil/${t.trader_wallet}`} className="hover:text-pervenche">
                          {t.trader_wallet.slice(0, 4)}…{t.trader_wallet.slice(-4)}
                        </Link>
                      </td>
                      <td className={`px-2 py-2.5 font-sans font-medium ${t.side === "buy" ? "text-achat" : "text-vente"}`}>
                        {t.side === "buy" ? "Achat" : "Vente"}
                      </td>
                      <td className="px-2 py-2.5 text-right">{fmt(Number(t.sol_amount), 4)}</td>
                      <td className="px-2 py-2.5 text-right">{fmt(Number(t.token_amount), 0)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <a href={explorerUrl("tx", t.signature)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-pervenche" suppressHydrationWarning>
                          {new Date(t.block_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {props.below}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        {live.migrated || progress >= 100 ? (
          <MigrationPanel mint={mint} pool={pool} migrated={live.migrated} onDone={() => void reload()} />
        ) : (
          <TradePanel mint={mint} pool={pool} ticker={ticker} migrated={live.migrated} warnings={props.warnings ?? []} onTraded={() => void reload()} />
        )}
        {props.sidebar}
        <p className="px-1 text-xs text-muted-foreground/80">Les memecoins sont spéculatifs : tu peux tout perdre. Pas un conseil financier.</p>
      </aside>
    </div>
  );
}
