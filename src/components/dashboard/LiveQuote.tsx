"use client";

import { useLiveItem } from "@/components/market/LiveValues";
import type { MarketItem } from "@/components/market/MarketRow";
import { Change, fullPrice } from "./Panel";

/** Prix complet et variation 24 h, en direct, avec un bref éclair à chaque mouvement. */
export function LiveQuote({ item, priceClass, changeClass }: { item: MarketItem; priceClass: string; changeClass: string }) {
  const v = useLiveItem(item);
  return (
    <>
      <p key={v.at} className={`${priceClass} ${v.dir === "up" ? "flash-up" : v.dir === "down" ? "flash-down" : ""}`}>
        {fullPrice(v.price)}
      </p>
      <Change v={v.change24} className={changeClass} />
    </>
  );
}
