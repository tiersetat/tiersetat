"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { displayName } from "@/lib/display";
import { usd } from "@/lib/market-format";
import type { FeedItem } from "@/lib/feed";

type Scope = "mondial" | "amis";
type Trade = Extract<FeedItem, { kind: "trade" }>;

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto", style: "narrow" });
function ago(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (Math.abs(s) < 60) return "maintenant";
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

/**
 * Qui achète en ce moment : « Mondial » (tous les traders) ou « Amis » (ceux que tu suis),
 * en liste façon iOS, actualisée toutes les 8 secondes.
 */
export function LiveActivity({ limit = 12 }: { limit?: number }) {
  const [scope, setScope] = useState<Scope>("mondial");
  const [items, setItems] = useState<Trade[] | null>(null);
  const [notice, setNotice] = useState<null | "login" | "follows">(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/fil?type=echanges${scope === "amis" ? "&abonnements=1" : ""}`);
      const j = (await r.json()) as { items: FeedItem[]; needLogin?: boolean; noFollows?: boolean };
      setNotice(j.needLogin ? "login" : j.noFollows ? "follows" : null);
      setItems(j.items.filter((i): i is Trade => i.kind === "trade").slice(0, limit));
    } catch {
      /* réseau indisponible : on garde la liste affichée */
    }
  }, [scope, limit]);

  useEffect(() => {
    Promise.resolve().then(() => setItems(null)).then(load);
    const id = setInterval(load, 8_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <section className="space-y-3">
      {/* Sélecteur segmenté, façon iOS */}
      <div role="tablist" aria-label="Activité" className="relative grid grid-cols-2 rounded-2xl bg-white/[0.07] p-1">
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-[0_2px_8px_rgb(0_0_0/0.35)] transition-transform duration-300 ease-out"
          style={{ transform: scope === "amis" ? "translateX(100%)" : "none" }}
        />
        {(
          [
            ["mondial", "🌍 Mondial"],
            ["amis", "👥 Amis"],
          ] as [Scope, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={scope === k}
            onClick={() => setScope(k)}
            className={`relative z-10 rounded-xl py-2 text-sm font-bold transition-colors ${scope === k ? "text-nuit" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl bg-surface ring-1 ring-white/[0.08]">
        {items === null ? (
          <ul>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="size-10 animate-pulse rounded-full bg-white/[0.08]" />
                <span className="h-3 flex-1 animate-pulse rounded bg-white/[0.08]" />
              </li>
            ))}
          </ul>
        ) : notice === "login" ? (
          <Empty title="Suis la FOMO de tes amis" text="Connecte-toi, puis abonne-toi à des traders : leurs achats apparaîtront ici en direct." />
        ) : notice === "follows" ? (
          <Empty title="Tu ne suis encore personne" text="Ouvre le profil d'un trader et touche « Suivre » : tu verras ici chacun de ses achats." />
        ) : items.length === 0 ? (
          <Empty
            title={scope === "mondial" ? "Personne n'a encore acheté aujourd'hui" : "Tes amis n'ont rien acheté récemment"}
            text={scope === "mondial" ? "Le premier achat apparaîtra ici, en direct. Ce sera peut-être le tien." : "Dès qu'un de tes amis achète, tu le vois ici."}
          />
        ) : (
          <ul className="divide-y divide-white/[0.07]">
            {items.map((t) => (
              <li key={t.id}>
                <Link href={`/token/${t.token.mint}`} className="flex items-center gap-3 px-4 py-3 transition active:bg-white/[0.06]">
                  <Avatar wallet={t.author.wallet} pseudo={t.author.pseudo} url={t.author.avatar_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px]">
                      <span className="font-bold">{displayName(t.author)}</span>{" "}
                      <span className={t.side === "buy" ? "text-achat" : "text-vente"}>{t.side === "buy" ? "a acheté" : "a vendu"}</span>
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      <span className="font-mono font-bold text-foreground">{usd(t.usd)}</span> de ${t.token.ticker} · {ago(t.at)}
                    </p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element -- images IPFS */}
                  <img src={t.token.image_url} alt="" loading="lazy" className="size-11 shrink-0 rounded-xl bg-muted object-cover" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-1 px-6 py-8 text-center">
      <p className="font-bold">{title}</p>
      <p className="mx-auto max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
