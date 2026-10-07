"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { displayName } from "@/lib/display";
import { Avatar } from "./Avatar";

export type ActivityItem = {
  kind: "launch" | "trade";
  actor_wallet: string;
  mint: string;
  name: string;
  ticker: string;
  image_url: string;
  side: "buy" | "sell" | null;
  sol_amount: number | null;
  signature: string;
  at: string;
};
export type FeedProfile = { wallet: string; pseudo: string | null; avatar_url: string | null };

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
function timeAgo(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (Math.abs(s) < 60) return rtf.format(Math.round(s), "second");
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

/** Lancements et trades des comptes suivis, en temps réel (Supabase Realtime). */
export function ActivityFeed({ initial, profiles }: { initial: ActivityItem[]; profiles: FeedProfile[] }) {
  const [items, setItems] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const followed = useMemo(() => new Map(profiles.map((p) => [p.wallet, p])), [profiles]);
  const tokenCache = useRef(new Map<string, { name: string; ticker: string; image_url: string; hidden: boolean }>());

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    const push = (item: ActivityItem) => {
      setItems((list) => (list.some((i) => i.signature === item.signature && i.kind === item.kind) ? list : [item, ...list].slice(0, 100)));
      setFresh((s) => new Set(s).add(`${item.kind}-${item.signature}`));
    };

    const channel = supabase
      .channel("mes-abonnements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tokens" }, ({ new: t }) => {
        const row = t as { creator_wallet: string; mint: string; name: string; ticker: string; image_url: string; launch_signature: string; created_at: string; hidden: boolean };
        if (row.hidden || !followed.has(row.creator_wallet)) return;
        push({ kind: "launch", actor_wallet: row.creator_wallet, mint: row.mint, name: row.name, ticker: row.ticker, image_url: row.image_url, side: null, sol_amount: null, signature: row.launch_signature, at: row.created_at });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trades" }, async ({ new: t }) => {
        const row = t as { trader_wallet: string; mint: string; side: "buy" | "sell"; sol_amount: number; signature: string; block_time: string };
        if (!followed.has(row.trader_wallet)) return;
        let token = tokenCache.current.get(row.mint);
        if (!token) {
          const { data } = await supabase.from("tokens").select("name, ticker, image_url, hidden").eq("mint", row.mint).maybeSingle();
          if (!data) return; // token masqué : invisible pour le public
          token = data as { name: string; ticker: string; image_url: string; hidden: boolean };
          tokenCache.current.set(row.mint, token);
        }
        push({ kind: "trade", actor_wallet: row.trader_wallet, mint: row.mint, name: token.name, ticker: token.ticker, image_url: token.image_url, side: row.side, sol_amount: row.sol_amount, signature: row.signature, at: row.block_time });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [followed]);

  if (items.length === 0) {
    return (
      <div className="surface space-y-2 p-10 text-center">
        <p className="font-medium">Rien pour l&apos;instant</p>
        <p className="text-sm text-muted-foreground">Les lancements et les trades des comptes que tu suis apparaîtront ici en direct.</p>
      </div>
    );
  }

  return (
    <ul className="surface divide-y divide-ligne">
      {items.map((item) => {
        const actor = followed.get(item.actor_wallet) ?? { wallet: item.actor_wallet, pseudo: null, avatar_url: null };
        const key = `${item.kind}-${item.signature}`;
        return (
          <li key={key} className={`flex items-center gap-3 px-5 py-4 ${fresh.has(key) ? "animate-in fade-in slide-in-from-top-2 bg-pervenche/[0.06] duration-700" : ""}`}>
            <Link href={`/profil/${actor.wallet}`} className="shrink-0">
              <Avatar wallet={actor.wallet} pseudo={actor.pseudo} url={actor.avatar_url} size={36} />
            </Link>
            <p className="min-w-0 flex-1 text-sm">
              <Link href={`/profil/${actor.wallet}`} className="font-medium hover:text-pervenche">
                {displayName(actor)}
              </Link>{" "}
              <span className="text-muted-foreground">
                {item.kind === "launch" ? "a créé" : item.side === "buy" ? `a acheté pour ${Number(item.sol_amount).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} SOL de` : `a vendu pour ${Number(item.sol_amount).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} SOL de`}
              </span>{" "}
              <Link href={`/token/${item.mint}`} className="font-medium hover:text-pervenche">
                {item.name} <span className="font-mono text-xs text-pervenche">${item.ticker}</span>
              </Link>
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS */}
            <img src={item.image_url} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
            <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block" suppressHydrationWarning>
              {timeAgo(item.at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
