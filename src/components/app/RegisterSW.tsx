"use client";

import { useEffect } from "react";

/** Enregistre le service worker (installation de l'application, page hors connexion). */
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
  }, []);
  return null;
}
