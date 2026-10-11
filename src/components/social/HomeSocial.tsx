"use client";

import { useSyncExternalStore } from "react";
import { LiveActivity } from "./LiveActivity";

const QUERY = "(min-width: 1024px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** Widget Social de l'accueil : une seule instance, à gauche sur ordinateur ou compacte sur téléphone. */
export function HomeSocial({ placement }: { placement: "gauche" | "liste" }) {
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  if ((placement === "gauche") !== desktop) return null;
  return (
    <div className="space-y-2">
      <h2 className="px-1 text-lg font-extrabold">Social</h2>
      <LiveActivity limit={placement === "gauche" ? 10 : 4} />
    </div>
  );
}
