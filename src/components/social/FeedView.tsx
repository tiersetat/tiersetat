"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { displayName } from "@/lib/display";
import { usd } from "@/lib/market-format";
import type { FeedItem } from "@/lib/feed";

type Type = "tout" | "echanges" | "theses";
const TYPES: { k: Type; label: string }[] = [
  { k: "tout", label: "Tout" },
  { k: "echanges", label: "Achats et ventes" },
  { k: "theses", label: "Thèses" },
];
const MINS = [0, 10, 100, 1000];

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto", style: "short" });
function ago(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (Math.abs(s) < 60) return "à l'instant";
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

/** Le fil : achats, ventes et thèses des traders, actualisé toutes les 10 secondes. */
export function FeedView({ initial }: { initial: FeedItem[] }) {
  const [type, setType] = useState<Type>("tout");
  const [min, setMin] = useState(0);
  const [follows, setFollows] = useState(false);
  const [items, setItems] = useState<FeedItem[]>(initial);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/fil?type=${type}&min=${min}${follows ? "&abonnements=1" : ""}`);
      const j = (await r.json()) as { items: FeedItem[]; needLogin?: boolean; noFollows?: boolean };
      setItems(j.items);
      setNotice(j.needLogin ? "Connecte-toi pour voir le fil de tes abonnements." : j.noFollows ? "Tu ne suis encore personne : abonne-toi à des traders depuis leur profil." : null);
    } catch {
      /* réseau indisponible : on garde le fil affiché */
    }
  }, [type, min, follows]);

  useEffect(() => {
    Promise.resolve().then(load);
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {TYPES.map((t) => (
          <button key={t.k} type="button" onClick={() => setType(t.k)} className={`chip shrink-0 ${type === t.k ? "chip-active" : ""}`}>
            {t.label}
          </button>
        ))}
        <button type="button" onClick={() => setFollows((v) => !v)} aria-pressed={follows} className={`chip shrink-0 ${follows ? "chip-active" : ""}`}>
          Mes abonnements
        </button>
      </div>
      {type !== "theses" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Taille min.</span>
          {MINS.map((m) => (
            <button key={m} type="button" onClick={() => setMin(m)} className={`rounded-full px-3 py-1 font-bold ${min === m ? "bg-white text-nuit" : "bg-white/[0.06] text-muted-foreground"}`}>
              {m === 0 ? "Tout" : `>$${m >= 1000 ? `${m / 1000}K` : m}`}
            </button>
          ))}
        </div>
      )}
      {notice && <p className="surface p-5 text-center text-sm text-muted-foreground">{notice}</p>}
      {!notice && items.length === 0 && (
        <p className="surface p-8 text-center text-sm text-muted-foreground">Rien pour l&apos;instant. Le premier échange apparaîtra ici en direct.</p>
      )}
      <ul className="space-y-2">
        {items.map((it) => (
          <FeedCard key={it.id} it={it} />
        ))}
      </ul>
    </div>
  );
}

export function FeedCard({ it }: { it: FeedItem }) {
  const badge =
    it.kind === "trade"
      ? it.side === "buy"
        ? { t: "Achat", c: "bg-achat/15 text-achat" }
        : { t: "Vente", c: "bg-vente/15 text-vente" }
      : it.kind === "these"
        ? { t: "Thèse", c: "bg-soleil/15 text-soleil" }
        : { t: "Commentaire", c: "bg-white/[0.08] text-muted-foreground" };
  return (
    <li className="surface p-4">
      <div className="flex items-center gap-2.5">
        <Link href={`/profil/${it.author.wallet}`} className="flex min-w-0 items-center gap-2.5">
          <Avatar wallet={it.author.wallet} pseudo={it.author.pseudo} url={it.author.avatar_url} size={34} />
          <span className="truncate font-bold">{displayName(it.author)}</span>
        </Link>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold ${badge.c}`}>{badge.t}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>
          {ago(it.at)}
        </span>
      </div>
      <Link href={`/token/${it.token.mint}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5 transition hover:bg-white/[0.07]">
        {/* eslint-disable-next-line @next/next/no-img-element -- images IPFS */}
        <img src={it.token.image_url} alt="" loading="lazy" className="size-10 shrink-0 rounded-xl bg-muted object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">${it.token.ticker}</span>
          {it.kind === "trade" ? (
            <span className="block truncate text-sm text-muted-foreground">
              <strong className="text-foreground">{usd(it.usd)}</strong> à <strong className="text-foreground">{usd(it.mcapUsd)}</strong> de cap.
            </span>
          ) : it.position ? (
            <span className="block truncate text-sm">
              <strong>{it.position.closed ? "Position soldée" : usd(it.position.valueUsd)}</strong>{" "}
              {it.position.pnlPct !== null && (
                <span className={it.position.pnlPct >= 0 ? "text-achat" : "text-vente"}>
                  ({it.position.pnlPct >= 0 ? "▲" : "▼"} {Math.abs(it.position.pnlPct).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %)
                </span>
              )}
            </span>
          ) : (
            <span className="block truncate text-sm text-muted-foreground">{it.token.name}</span>
          )}
        </span>
      </Link>
      {it.kind !== "trade" && <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed">{it.body}</p>}
    </li>
  );
}
