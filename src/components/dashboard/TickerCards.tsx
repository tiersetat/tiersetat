import Link from "next/link";
import { TokenLogo } from "@/components/market/TokenLogo";
import type { MarketItem } from "@/components/market/MarketRow";
import { LiveQuote } from "./LiveQuote";
import { Sparkline } from "./Sparkline";

/** Les grandes cryptos en cartes : logo, nom, prix, variation 24 h et courbe 7 jours (CoinGecko). */
export function TickerCards({ items }: { items: MarketItem[] }) {
  if (items.length === 0) {
    return <p className="dash-panel p-4 text-sm text-muted-foreground">Cours momentanément indisponibles. Réessaie dans une minute.</p>;
  }
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
      {items.map((c) => (
        <Link key={c.address} href={c.href ?? `/crypto/${c.address}`} className="dash-panel dash-hover w-44 shrink-0 snap-start p-3.5 sm:w-auto">
          <div className="flex items-center gap-2.5">
            <TokenLogo src={c.imageUrl} symbol={c.symbol} name={c.name} size={30} className="rounded-full" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold">{c.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{c.symbol}</p>
            </div>
          </div>
          <LiveQuote item={c} priceClass="mt-2.5 font-mono text-xl font-bold tabular-nums" changeClass="text-xs" />
          {c.sparkline && <Sparkline points={c.sparkline} className="mt-1.5 h-9 w-full" />}
        </Link>
      ))}
    </div>
  );
}
