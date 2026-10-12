"use client";

import type { FeedItem } from "@/lib/feed";

/**
 * Le flux « qui achète » (Mondial), partagé par tous les composants de la page (Social, ondes de la carte…) :
 * une seule requête toutes les 8 s quel que soit le nombre d'abonnés, en pause quand l'onglet est caché.
 */
type Listener = (items: FeedItem[]) => void;
const POLL_MS = 8_000;
const listeners = new Set<Listener>();
let last: FeedItem[] | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let inflight = false;

async function load() {
  if (inflight || document.hidden) return;
  inflight = true;
  try {
    const j = (await (await fetch("/api/fil?type=echanges")).json()) as { items: FeedItem[] };
    last = j.items;
    listeners.forEach((l) => l(j.items));
  } catch {
    /* réseau indisponible : on garde les dernières données */
  } finally {
    inflight = false;
  }
}
const onVisible = () => {
  if (!document.hidden) void load();
};

export function subscribeTrades(listener: Listener): () => void {
  listeners.add(listener);
  if (last) listener(last);
  if (!timer) {
    void load();
    timer = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}
