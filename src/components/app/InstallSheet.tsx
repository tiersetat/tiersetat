"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Env = "installed" | "android" | "ios-safari" | "ios-inapp" | "android-inapp" | "desktop";

const KEY = "te_install_dismissed";
const noop = () => () => {};

/** Appli d'où vient le lien (navigateur intégré), pour expliquer le bon geste. */
function sourceApp(ua: string): string | null {
  if (/instagram/i.test(ua)) return "Instagram";
  if (/fban|fbav|fb_iab/i.test(ua)) return "Facebook";
  if (/tiktok|bytedance|musical_ly/i.test(ua)) return "TikTok";
  if (/twitter/i.test(ua)) return "X";
  if (/snapchat/i.test(ua)) return "Snapchat";
  if (/linkedin/i.test(ua)) return "LinkedIn";
  if (/telegram/i.test(ua)) return "Telegram";
  if (/whatsapp/i.test(ua)) return "WhatsApp";
  return null;
}

function detect(): Env {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ios = /iphone|ipad|ipod/i.test(ua);
  const android = /android/i.test(ua);
  // Navigateurs intégrés des applis : impossible d'y installer. Chrome, Firefox et Edge sur iPhone, eux, le permettent.
  const iosBrowser = /crios|fxios|edgios/i.test(ua);
  const inapp = sourceApp(ua) !== null || /; wv\)/i.test(ua) || (ios && !iosBrowser && !/safari/i.test(ua));
  if (ios) return inapp ? "ios-inapp" : "ios-safari";
  if (android) return inapp ? "android-inapp" : "android";
  return "desktop";
}

function dismissed() {
  try {
    return Number(localStorage.getItem(KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/** Icône « Partager » d'iOS (carré avec une flèche vers le haut). */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline size-5 align-[-4px] text-[#0a84ff]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label="Partager">
      <path d="M12 3v12M8 7l4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  );
}

/**
 * Invitation à ajouter Tiers-État sur l'écran d'accueil, dès l'ouverture du lien.
 * Android : installation en un appui. iPhone : les 2 gestes imposés par Apple. Navigateur d'une appli : ouvrir dans Safari / Chrome.
 */
export function InstallSheet() {
  const env = useSyncExternalStore(noop, detect, () => "installed" as Env);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = setTimeout(() => setOpen(!dismissed()), 900);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, []);

  if (!open || env === "installed" || env === "desktop") return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, String(Date.now() + 3 * 86_400_000)); // reproposé dans 3 jours
    } catch {
      /* stockage indisponible */
    }
    setOpen(false);
  };
  const url = typeof window !== "undefined" ? window.location.href : "https://tiersetat.vercel.app";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="ios-glass w-full max-w-md space-y-4 rounded-[28px] p-5 text-center" role="dialog" aria-modal="true" aria-labelledby="install-title">
        <div className="flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- icône de l'appli */}
          <img src="/icon-192.png" alt="" className="size-14 rounded-2xl shadow-lg" />
          <div className="text-left">
            <p id="install-title" className="text-lg font-extrabold">Installe Tiers-État</p>
            <p className="text-sm text-white/75">Sur ton écran d&apos;accueil, comme une vraie appli.</p>
          </div>
        </div>

        {env === "android" && (
          <button
            type="button"
            className="btn-fete w-full"
            onClick={async () => {
              if (!prompt) return;
              await prompt.prompt();
              await prompt.userChoice;
              close();
            }}
            disabled={!prompt}
          >
            {prompt ? "Installer" : "Préparation…"}
          </button>
        )}

        {env === "ios-safari" && (
          <ol className="space-y-2 text-left text-[15px]">
            <li className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm font-extrabold text-nuit">1</span>
              <span>
                Touche <ShareIcon /> <strong>Partager</strong> {typeof navigator !== "undefined" && /crios|fxios|edgios/i.test(navigator.userAgent) ? "en haut à droite" : "en bas de l'écran"}
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm font-extrabold text-nuit">2</span>
              <span>
                Choisis <strong>« Sur l&apos;écran d&apos;accueil »</strong> <span className="text-white/60">(fais défiler si besoin)</span>
              </span>
            </li>
          </ol>
        )}

        {env === "ios-inapp" && <InAppHelp url={url} />}

        {env === "android-inapp" && (
          <div className="space-y-3">
            <p className="text-sm text-white/80">Tu es dans le navigateur d&apos;une appli. Ouvre Tiers-État dans Chrome pour l&apos;installer.</p>
            <a href={`intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`} className="btn-fete w-full">
              Ouvrir dans Chrome
            </a>
          </div>
        )}

        <button type="button" onClick={close} className="text-sm font-semibold text-white/60">
          Plus tard
        </button>
        {env === "ios-safari" && <div aria-hidden className="mx-auto -mb-2 size-0 animate-bounce border-x-[10px] border-t-[12px] border-x-transparent border-t-white/70" />}
      </div>
    </div>
  );
}

/** Dans le navigateur d'une appli (Instagram, X, TikTok…) : il faut d'abord ouvrir le lien dans Safari. */
function InAppHelp({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const app = typeof navigator !== "undefined" ? sourceApp(navigator.userAgent) : null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copie ce lien puis colle-le dans Safari :", url);
    }
  };
  const gesture =
    app === "Instagram" || app === "Facebook"
      ? "Touche ••• en haut à droite, puis « Ouvrir dans le navigateur externe »."
      : app === "TikTok"
        ? "Touche ••• en haut à droite, puis « Ouvrir dans le navigateur »."
        : app === "X"
          ? "Touche l'icône Partager en bas, puis « Ouvrir dans Safari »."
          : "Touche le menu (••• ou la boussole), puis « Ouvrir dans Safari ».";
  return (
    <div className="space-y-3 text-left">
      <p className="text-sm text-white/80">
        {app ? `Tu es dans ${app}.` : "Tu es dans le navigateur d'une appli."} Apple ne permet d&apos;installer Tiers-État que depuis Safari.
      </p>
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3 text-[15px]">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm font-extrabold text-nuit">1</span>
        <span>{gesture}</span>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3 text-[15px]">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-sm font-extrabold text-nuit">2</span>
        <span>
          Dans Safari, touche <ShareIcon /> puis <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
        </span>
      </div>
      <p className="text-center text-xs text-white/60">Ça ne marche pas ? Copie le lien et colle-le dans Safari :</p>
      <button type="button" onClick={copy} className="btn-fete w-full">
        {copied ? "Lien copié, colle-le dans Safari" : "Copier le lien"}
      </button>
      <a href={`x-safari-${url}`} className="block text-center text-sm font-semibold text-white/70 underline underline-offset-2">
        Essayer d&apos;ouvrir Safari directement
      </a>
    </div>
  );
}
