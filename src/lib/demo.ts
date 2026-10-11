"use client";

import { useSyncExternalStore } from "react";

/**
 * Mode démo, pour les vidéos (enregistrement d'écran) : activé seulement sur l'appareil qui ouvre
 * le lien « ?demo=on » (désactivé par « ?demo=off »). Masque les mentions de la bêta et affiche un solde de démonstration.
 */
export const DEMO_CASH_EUR = 354_838.87;
const KEY = "te_demo";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
const subscribe = (cb: () => void) => {
  window.addEventListener("te-demo", cb);
  return () => window.removeEventListener("te-demo", cb);
};

export function useDemo(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Lit « ?demo=on|off » dans l'adresse et applique le mode (classe « demo » sur la page). */
export function syncDemoFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get("demo");
    if (v === "on") localStorage.setItem(KEY, "1");
    if (v === "off") localStorage.removeItem(KEY);
    document.documentElement.classList.toggle("demo", read());
    window.dispatchEvent(new Event("te-demo"));
  } catch {
    /* stockage indisponible : pas de mode démo */
  }
}
