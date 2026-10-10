"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Liste de surveillance gardée sur l'appareil (les adresses des tokens suivis). */
const KEY = "te_watchlist_v1";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}
function write(list: string[]) {
  cache = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible : la liste vit le temps de la visite */
  }
  listeners.forEach((l) => l());
}
const EMPTY: string[] = [];

export function useWatchlist() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
  const toggle = useCallback((address: string) => {
    const cur = read();
    write(cur.includes(address) ? cur.filter((a) => a !== address) : [address, ...cur].slice(0, 100));
  }, []);
  return { list, toggle, has: (a: string) => list.includes(a) };
}
