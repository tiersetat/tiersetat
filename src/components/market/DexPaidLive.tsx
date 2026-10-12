"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TokenLogo } from "./TokenLogo";
import { pct, usd } from "@/lib/market-format";
import { liveKeyOf, useLiveQuote } from "./livePrices";
import type { PaidItem } from "@/lib/market-feeds";

const CHAIN: Record<string, { label: string; color: string }> = {
  solana: { label: "SOL", color: "#9945ff" },
  robinhood: { label: "HOOD", color: "#ccff00" },
  base: { label: "BASE", color: "#0052ff" },
  bsc: { label: "BNB", color: "#f3ba2f" },
  ethereum: { label: "ETH", color: "#8a92b2" },
};
const POLL_MS = 10_000;

function since(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

/**
 * Les tokens qui viennent de payer leur profil DexScreener (« DEX payé »), en direct :
 * actualisés toutes les 10 s, les nouveaux s'allument en arrivant. Aucun n'est vérifié ni recommandé.
 */
export function DexPaidLive({ chain, initial }: { chain: string | null; initial: PaidItem[] }) {
  const [items, setItems] = useState<PaidItem[]>(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const known = useRef(new Set(initial.map((i) => i.address)));

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const j = (await (await fetch(`/api/listes?tri=dexpaye${chain ? `&chaine=${chain}` : ""}`)).json()) as { items: PaidItem[] };
        if (stop) return;
        const added = j.items.filter((i) => !known.current.has(i.address)).map((i) => i.address);
        added.forEach((a) => known.current.add(a));
        setItems(j.items);
        if (added.length) {
          setFresh(new Set(added));
          setTimeout(() => !stop && setFresh(new Set()), 6000);
        }
      } catch {
        /* réseau indisponible : on garde la liste */
      }
    };
    const id = setInterval(load, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [chain]);

  if (items.length === 0) {
    return <p className="rounded-3xl bg-surface p-8 text-center text-sm text-muted-foreground">Aucun « DEX payé » récent sur cette blockchain. La liste se met à jour toute seule.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-achat opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-achat" />
        </span>
        En direct · mis à jour toutes les 10 s
      </p>
      <ul className="overflow-hidden rounded-3xl bg-surface p-1.5 ring-1 ring-white/[0.08]">
        {items.map((t) => {
          const c = CHAIN[t.chain];
          return (
            <li key={`${t.chain}:${t.address}`} className={`rounded-2xl transition-colors duration-1000 ${fresh.has(t.address) ? "bg-achat/15" : ""}`}>
              <Link href={t.href ?? `/marche/${t.address}`} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 hover:bg-white/[0.04]">
                <TokenLogo src={t.imageUrl} symbol={t.symbol} name={t.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {t.name} <span className="font-mono text-xs font-semibold text-muted-foreground">${t.symbol}</span>
                  </p>
                  <p className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] text-muted-foreground">
                    {c && (
                      <span className="flex items-center gap-1 font-semibold">
                        <span className="size-1.5 rounded-full" style={{ background: c.color }} />
                        {c.label}
                      </span>
                    )}
                    <span className="shrink-0 rounded bg-electrique/25 px-1 font-semibold text-pervenche">DEX payé</span>
                    <span suppressHydrationWarning>{t.early ? "récent" : `vu il y a ${since(t.paidAt, now)}`}</span>
                    {t.bonding && <span>· bonding</span>}
                  </p>
                </div>
                <PaidValues t={t} />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="px-1 text-xs text-muted-foreground">
        Tokens qui viennent de payer leur profil DexScreener (« DEX payé »), du plus récent au plus ancien ; l&apos;heure est celle où Tiers-État les a vus apparaître. Solana, Robinhood, Base, BNB et Ethereum. Payer un profil ne prouve rien : ni vérifiés ni recommandés
        par Tiers-État, très risqués.
      </p>
    </div>
  );
}

/** Capitalisation et variation 24 h en direct (Jupiter sur Solana, DexScreener ailleurs), avec éclair à chaque mouvement. */
function PaidValues({ t }: { t: PaidItem }) {
  const q = useLiveQuote(liveKeyOf(t));
  const mcap = q?.mcap ?? (q && t.mcapUsd !== null && t.priceUsd ? (t.mcapUsd * q.price) / t.priceUsd : t.mcapUsd);
  const change = q?.change24 ?? t.change24;
  const up = (change ?? 0) >= 0;
  return (
    <div className="shrink-0 text-right">
      <p key={q?.at} className={`font-mono text-sm font-semibold tabular-nums ${q?.dir === "up" ? "flash-up" : q?.dir === "down" ? "flash-down" : ""}`}>
        {mcap !== null ? usd(mcap) : "—"}
      </p>
      <p className={`font-mono text-[11px] tabular-nums ${change === null ? "text-muted-foreground" : up ? "text-achat" : "text-vente"}`}>{change === null ? "cap." : pct(change)}</p>
    </div>
  );
}
