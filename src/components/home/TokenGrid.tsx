"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { TokenCard as Card } from "@/components/brand/TokenCard";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Tab, TokenCard } from "@/lib/tokens";

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function timeAgo(iso: string): string {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, "second"], [60, "minute"], [24, "hour"], [30, "day"], [12, "month"]];
  let value = s;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return rtf.format(Math.round(value), unit);
    value /= size;
  }
  return rtf.format(Math.round(value), "year");
}

const EMPTY: Record<Tab, string> = {
  nouveaux: "Le premier mème de l'histoire de Tiers-État reste à frapper. Ce sera peut-être le tien.",
  tendances: "Aucun échange dans les dernières 24 heures.",
  bastille: "Aucun token n'a encore rempli la moitié de sa bonding curve.",
};

/** Transparence en un coup d'œil : le créateur a-t-il revendu ses tokens ? */
function CreatorSoldBadge({ pct }: { pct?: number | null }) {
  if (pct === undefined || pct === null) return null;
  if (pct >= 10) {
    return (
      <span className="shrink-0 rounded-full bg-vente/15 px-2 py-0.5 font-medium text-vente" title="Part de ses tokens revendue par le créateur">
        Créateur a vendu {Math.round(pct)} %
      </span>
    );
  }
  if (pct < 1) return <span className="shrink-0 rounded-full bg-achat/15 px-2 py-0.5 font-medium text-achat">Créateur tient</span>;
  return null;
}

/** Grille des assignats, mise à jour en temps réel (Supabase Realtime). */
export function TokenGrid({ tab, initial }: { tab: Tab; initial: TokenCard[] }) {
  const [tokens, setTokens] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  /** Clignotement vert/rouge d'une carte quand sa capitalisation bouge (temps réel) */
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const tokensRef = useRef(tokens);
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    const channel = supabase
      .channel(`place-publique-${tab}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tokens" }, ({ new: row }) => {
        const token = row as TokenCard & { hidden: boolean };
        if (tab !== "nouveaux" || token.hidden) return;
        setTokens((list) => (list.some((t) => t.mint === token.mint) ? list : [token, ...list]));
        setFresh((s) => new Set(s).add(token.mint));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tokens" }, ({ new: row }) => {
        const token = row as TokenCard & { hidden: boolean };
        const prev = tokensRef.current.find((t) => t.mint === token.mint);
        if (prev && !token.hidden && Number(token.market_cap_sol) !== Number(prev.market_cap_sol)) {
          const dir = Number(token.market_cap_sol) > Number(prev.market_cap_sol) ? "up" : "down";
          setFlash((f) => ({ ...f, [token.mint]: dir }));
          setTimeout(() => setFlash((f) => {
            const next = { ...f };
            delete next[token.mint];
            return next;
          }), 1400);
        }
        setTokens((list) =>
          token.hidden
            ? list.filter((t) => t.mint !== token.mint)
            : list.map((t) => (t.mint === token.mint ? { ...t, ...token } : t)),
        );
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tab]);

  if (tokens.length === 0) {
    return (
      <div className="surface flex flex-col items-center gap-4 px-6 py-16 text-center">
        <LogoMark size={56} className="opacity-80" />
        <p className="text-muted-foreground">{EMPTY[tab]}</p>
        <Link href="/lancer" className="btn-primary">
          Créer un token
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((t) => (
        <li
          key={t.mint}
          className={`rounded-2xl transition-[box-shadow,transform] duration-500 hover:-translate-y-0.5 ${fresh.has(t.mint) ? "animate-in fade-in slide-in-from-top-4 duration-700" : ""} ${
            flash[t.mint] === "up" ? "shadow-[0_0_0_2px_rgba(74,222,128,0.7),0_0_40px_-10px_rgba(74,222,128,0.8)]" : flash[t.mint] === "down" ? "shadow-[0_0_0_2px_rgba(248,113,113,0.7),0_0_40px_-10px_rgba(248,113,113,0.8)]" : ""
          }`}
        >
          <Link href={`/token/${t.mint}`} className="block" aria-label={`${t.name} ($${t.ticker})`}>
            <Card
              name={t.name}
              ticker={t.ticker}
              imageUrl={t.image_url}
              marketCapSol={Number(t.market_cap_sol)}
              progress={Number(t.curve_progress)}
              footer={
                <p className="flex items-center justify-between gap-2 border-t border-ligne pt-3 text-[11px] text-muted-foreground" suppressHydrationWarning>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">
                      par <span className="font-mono">{t.creator_wallet.slice(0, 4)}…{t.creator_wallet.slice(-4)}</span>
                    </span>
                    <CreatorSoldBadge pct={t.creator_sold_pct} />
                  </span>
                  <span>{t.migrated ? <span className="text-achat">Sur le DEX</span> : timeAgo(t.created_at)}</span>
                </p>
              }
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
