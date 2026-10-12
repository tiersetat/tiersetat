"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TokenLogo } from "@/components/market/TokenLogo";
import { useWatchlist } from "@/components/market/useWatchlist";
import type { MarketItem } from "@/components/market/MarketRow";
import { Change, Panel, fullPrice } from "./Panel";
import { useLiveItem } from "@/components/market/LiveValues";

/**
 * Ma watchlist : les favoris (étoile) de cet appareil, avec leur prix en direct.
 * Sans favori, on montre le top 10 du marché (vraies données) en invitant à composer sa liste.
 */
export function WatchlistPanel({ top }: { top: MarketItem[] }) {
  const { list } = useWatchlist();
  const key = list.join(",");
  const [mine, setMine] = useState<MarketItem[] | null>(null);

  useEffect(() => {
    if (!key) return;
    let stop = false;
    const load = () =>
      fetch(`/api/marche?mints=${key}`)
        .then((r) => r.json())
        .then((j: { items: MarketItem[] }) => !stop && setMine(j.items))
        .catch(() => undefined);
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [key]);

  const showMine = Boolean(key) && mine !== null && mine.length > 0;
  const rows = showMine ? mine! : top.slice(0, 10);
  return (
    <Panel
      title={showMine ? "Ma watchlist" : "Top 10 du marché"}
      action={
        <Link href="/?tri=liste#tokens" className="chip px-3 py-1 text-xs">
          {showMine ? "Tout voir" : "Mes favoris"}
        </Link>
      }
    >
      {!showMine && <p className="-mt-1 mb-2 text-xs text-muted-foreground">Touche l&apos;étoile d&apos;un token pour composer ta watchlist.</p>}
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] text-muted-foreground">
            <th className="pb-1 text-left font-medium">Crypto</th>
            <th className="pb-1 text-right font-medium">Prix</th>
            <th className="pb-1 text-right font-medium">24 h</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <WatchRow key={c.address} c={c} i={i} />
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** Une ligne de la watchlist, en direct. */
function WatchRow({ c, i }: { c: MarketItem; i: number }) {
  const v = useLiveItem(c);
  return (
    <tr className="border-t border-white/[0.06]">
      <td className="py-1.5">
        <Link href={c.href ?? `/marche/${c.address}`} className="flex min-w-0 items-center gap-2 hover:text-pervenche">
          <span className="hidden w-4 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums min-[1700px]:inline">{i + 1}</span>
          <TokenLogo src={c.imageUrl} emoji={c.emoji} symbol={c.symbol} name={c.name} size={22} className="rounded-full" />
          <span className="truncate font-bold">{c.symbol}</span>
        </Link>
      </td>
      <td key={v.at} className={`whitespace-nowrap py-1.5 pl-2 text-right font-mono tabular-nums ${v.dir === "up" ? "flash-up" : v.dir === "down" ? "flash-down" : ""}`}>
        {fullPrice(v.price)}
      </td>
      <td className="py-1.5 pl-2 text-right">
        <Change v={v.change24} className="text-[11px]" />
      </td>
    </tr>
  );
}
