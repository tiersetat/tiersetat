"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const noop = () => () => {};
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Installer Tiers-État sur l'écran d'accueil.
 * Android / Chrome : vraie invite d'installation. iPhone : Apple impose le passage par « Partager », on l'explique.
 */
export function InstallApp({ className = "" }: { className?: string }) {
  const standalone = useSyncExternalStore(noop, isStandalone, () => true);
  const ios = useSyncExternalStore(noop, isIos, () => false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || installed || (!prompt && !ios)) return null;

  return (
    <div className={className}>
      <button
        type="button"
        className="btn-ghost inline-flex items-center gap-2"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === "accepted") setInstalled(true);
            setPrompt(null);
          } else {
            setShowIos((v) => !v);
          }
        }}
      >
        <span aria-hidden>📲</span> Installer l&apos;application
      </button>
      {showIos && (
        <p className="mt-2 max-w-xs rounded-xl border border-ligne bg-white/[0.03] p-3 text-left text-xs text-muted-foreground">
          Dans Safari, touche <strong className="text-foreground">Partager</strong> (le carré avec une flèche ⬆), puis{" "}
          <strong className="text-foreground">« Sur l&apos;écran d&apos;accueil »</strong>. Tiers-État s&apos;ouvrira comme une application.
        </p>
      )}
    </div>
  );
}
