"use client";

import { useState } from "react";
import { feteColor } from "@/components/brand/TokenCard";

/** Logo d'un token ou d'un marché : image, sinon pictogramme, sinon initiale sur une couleur de fête. */
export function TokenLogo({ src, emoji, symbol, name, size = 44, className = "rounded-2xl" }: { src?: string | null; emoji?: string | null; symbol: string; name: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (src && !broken) {
    // eslint-disable-next-line @next/next/no-img-element -- logos de domaines variables
    return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} style={style} className={`shrink-0 bg-white object-contain p-1 ${className}`} />;
  }
  if (emoji) {
    return (
      <span style={{ ...style, fontSize: size * 0.5 }} className={`grid shrink-0 place-items-center bg-white/[0.1] ${className}`}>
        {emoji}
      </span>
    );
  }
  const c = feteColor(symbol + name);
  return (
    <span style={{ ...style, background: c.bg, color: c.fg, fontSize: size * 0.4 }} className={`grid shrink-0 place-items-center font-extrabold ${className}`}>
      {symbol.slice(0, 1)}
    </span>
  );
}
