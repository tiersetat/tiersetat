"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noop = () => () => {};
const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function keyToBytes(base64: string): Uint8Array {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** Activer / couper les alertes sur cet appareil (Web Push). */
export function PushToggle() {
  const canPush = useSyncExternalStore(noop, supported, () => false);
  const ios = useSyncExternalStore(noop, isIos, () => false);
  const standalone = useSyncExternalStore(noop, isStandalone, () => false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!canPush) return;
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => setSubscribed(Boolean(s)), () => setSubscribed(false));
  }, [canPush]);

  if (ios && !standalone) {
    return <p className="text-[11px] text-muted-foreground">Sur iPhone, installe d&apos;abord Tiers-État sur l&apos;écran d&apos;accueil pour recevoir les alertes.</p>;
  }
  if (!canPush || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return null;

  async function toggle() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const current = await reg.pushManager.getSubscription();
      if (current) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: current.endpoint }) });
        await current.unsubscribe();
        setSubscribed(false);
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") {
        setMsg("Autorisation refusée : active les notifications pour ce site dans les réglages.");
        return;
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) {
        await sub.unsubscribe();
        throw new Error((await res.json()).error ?? "Activation impossible.");
      }
      setSubscribed(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Activation impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button type="button" disabled={busy || subscribed === null} onClick={() => void toggle()} className="btn-ghost w-full px-3 py-1.5 text-xs">
        {subscribed ? "🔕 Couper les alertes sur cet appareil" : "🔔 Activer les alertes sur cet appareil"}
      </button>
      {msg && <p className="text-[11px] text-vente">{msg}</p>}
    </div>
  );
}
