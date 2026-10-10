"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usd } from "@/lib/market-format";
import { feteColor } from "@/components/brand/TokenCard";

/** Un token tout juste créé (flux public PumpPortal : pump.fun et LetsBonk). */
type Created = { mint: string; name: string; symbol: string; uri: string; marketCapSol: number; pool: string; at: number; image?: string | null };

const MAX = 60;

/** Image d'un token : lue dans ses métadonnées (IPFS), avec une passerelle rapide. */
async function imageOf(uri: string): Promise<string | null> {
  try {
    const url = uri.replace("https://ipfs.io/ipfs/", "https://cf-ipfs.com/ipfs/");
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const json = (await res.json()) as { image?: string };
    return json.image && /^https:\/\//.test(json.image) ? json.image : null;
  } catch {
    return null;
  }
}

function since(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min`;
}

/** Les nouveaux tokens Solana, en direct, à la seconde où ils sont créés. */
export function NewTokensLive() {
  const [items, setItems] = useState<Created[]>([]);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<"connexion" | "direct" | "coupé">("connexion");
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    fetch("/api/prix")
      .then((r) => r.json())
      .then((j: { solEur: number | null; usdEur: number | null }) => j.solEur && j.usdEur && setSolUsd(j.solEur / j.usdEur))
      .catch(() => undefined);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    const connect = () => {
      ws = new WebSocket("wss://pumpportal.fun/api/data");
      ws.onopen = () => {
        setStatus("direct");
        ws?.send(JSON.stringify({ method: "subscribeNewToken" }));
      };
      ws.onmessage = (e) => {
        if (pausedRef.current) return;
        try {
          const m = JSON.parse(e.data as string) as Partial<Created> & { txType?: string };
          if (m.txType !== "create" || !m.mint || !m.symbol) return;
          const token: Created = { mint: m.mint, name: m.name ?? m.symbol, symbol: m.symbol, uri: m.uri ?? "", marketCapSol: Number(m.marketCapSol ?? 0), pool: m.pool ?? "pump", at: Date.now() };
          setItems((cur) => [token, ...cur.filter((c) => c.mint !== token.mint)].slice(0, MAX));
          if (token.uri) void imageOf(token.uri).then((image) => setItems((cur) => cur.map((c) => (c.mint === token.mint ? { ...c, image } : c))));
        } catch {
          /* message illisible : ignoré */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus("coupé");
        retry = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="flex items-center gap-2 text-sm font-bold">
          <span className={`size-2 rounded-full ${status === "direct" && !paused ? "animate-pulse bg-achat" : "bg-muted-foreground"}`} />
          {paused ? "En pause" : status === "direct" ? "En direct · chaque nouveau token Solana" : status === "connexion" ? "Connexion…" : "Reconnexion…"}
        </p>
        <button type="button" onClick={() => setPaused((p) => !p)} className="chip py-1.5">
          {paused ? "▶ Reprendre" : "⏸ Pause"}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-3xl bg-surface p-8 text-center text-sm text-muted-foreground ring-1 ring-white/[0.08]">Les prochains tokens créés vont apparaître ici, en direct…</p>
      ) : (
        <ul className="overflow-hidden rounded-3xl bg-surface p-1.5 ring-1 ring-white/[0.08]">
          {items.map((t) => {
            const c = feteColor(t.symbol + t.name);
            return (
              <li key={t.mint} className="rise-in">
                <Link href={`/marche/${t.mint}?c=solana`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/[0.05]">
                  {t.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- images IPFS
                    <img src={t.image} alt="" className="size-11 shrink-0 rounded-2xl bg-muted object-cover" />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold" style={{ background: c.bg, color: c.fg }}>
                      {t.symbol.slice(0, 1)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{t.symbol}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="shrink-0 rounded bg-white/[0.08] px-1 font-bold">{t.pool === "bonk" ? "LetsBonk" : "pump.fun"}</span>
                      <span className="truncate">{t.name}</span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-bold">{solUsd ? usd(t.marketCapSol * solUsd) : `${t.marketCapSol.toFixed(0)} SOL`}</p>
                    <p className="font-mono text-xs text-muted-foreground">cap.</p>
                  </div>
                  <span className="w-14 shrink-0 rounded-xl bg-achat/15 px-2 py-1.5 text-center font-mono text-xs font-bold text-achat" suppressHydrationWarning>
                    {since(t.at, now)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="px-1 text-xs text-muted-foreground">Tokens tout juste créés par n&apos;importe qui : ni vérifiés ni recommandés. Beaucoup ne valent rien, sois prudent.</p>
    </div>
  );
}
