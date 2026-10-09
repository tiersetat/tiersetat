"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Notification } from "@/app/api/notifications/route";
import { PushToggle } from "@/components/app/PushToggle";
import { displayName } from "@/lib/display";

const KEY = "te_notif_seen_v1";
const POLL_MS = 30_000;

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
function ago(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

function text(n: Notification) {
  const who = displayName({ wallet: n.actor, pseudo: n.actorPseudo });
  const token = n.ticker ? `$${n.ticker}` : "ton token";
  switch (n.kind) {
    case "follow":
      return `${who} s'est abonné à toi`;
    case "trade":
      return `${who} a ${n.side === "buy" ? "acheté" : "vendu"} ${token} (${(n.solAmount ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} SOL)`;
    case "comment":
      return `${who} a commenté ${token}`;
    case "launch":
      return `${who} a lancé ${n.tokenName ?? "un token"} (${token})`;
  }
}

function href(n: Notification) {
  return n.kind === "follow" ? `/profil/${n.actor}` : `/token/${n.mint}`;
}

function readSeen(): number {
  try {
    return Number(localStorage.getItem(KEY) ?? 0);
  } catch {
    return 0;
  }
}

/** Cloche de notifications (actualisée toutes les 30 s ; « lu » mémorisé dans le navigateur). */
export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [seen, setSeen] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const json = (await res.json()) as { items: Notification[] };
    setItems(json.items);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (!cancelled && document.visibilityState === "visible") void load();
    };
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setSeen(readSeen());
      tick();
    });
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load]);

  // Fermer en cliquant ailleurs
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const unread = items.filter((i) => Date.parse(i.at) > seen).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      try {
        localStorage.setItem(KEY, String(now));
      } catch {
        /* navigation privée */
      }
      // On garde l'affichage « non lu » pendant que le panneau est ouvert
      setTimeout(() => setSeen(now), 1500);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} aria-label={`Notifications${unread ? ` (${unread} nouvelles)` : ""}`} aria-expanded={open} className="relative grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-vente px-1 text-[10px] font-bold text-nuit">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-ligne bg-popover shadow-2xl">
          <p className="border-b border-ligne px-4 py-3 text-sm font-semibold">Notifications</p>
          {items.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Rien de nouveau. Suis des créateurs et lance des tokens pour recevoir des notifications.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-ligne overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={href(n)} onClick={() => setOpen(false)} className={`block px-4 py-3 text-sm hover:bg-white/[0.04] ${Date.parse(n.at) > seen ? "bg-pervenche/[0.07]" : ""}`}>
                    <p>{text(n)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground" suppressHydrationWarning>
                      {ago(n.at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-ligne p-3">
            <PushToggle />
          </div>
        </div>
      )}
    </div>
  );
}
