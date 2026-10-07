"use client";

import { useEffect, useState } from "react";

/** Temps restant avant la fin de la semaine du concours. */
export function Countdown({ end }: { end: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    Promise.resolve().then(tick);
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) return <span className="font-mono">…</span>;
  const s = Math.max(0, Math.floor((end - now) / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (
    <span className="font-mono tabular-nums">
      {d > 0 && `${d} j `}
      {String(h).padStart(2, "0")} h {String(m).padStart(2, "0")} min {String(s % 60).padStart(2, "0")} s
    </span>
  );
}
