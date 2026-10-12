import Link from "next/link";
import { TokenLogo } from "@/components/market/TokenLogo";
import type { MarketItem } from "@/components/market/MarketRow";
import { Change, Panel } from "./Panel";

/** Classement compact : rang, logo, symbole, variation 24 h alignée à droite. */
export function MoversPanel({ title, items }: { title: string; items: MarketItem[] }) {
  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Données momentanément indisponibles.</p>
      ) : (
        <ol className="space-y-0.5">
          {items.map((c, i) => (
            <li key={c.address}>
              <Link href={c.href ?? `/crypto/${c.address}`} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/[0.05]">
                <span className="w-4 font-mono text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                <TokenLogo src={c.imageUrl} symbol={c.symbol} name={c.name} size={24} className="rounded-full" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.symbol}</span>
                <Change v={c.change24} className="text-sm" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
