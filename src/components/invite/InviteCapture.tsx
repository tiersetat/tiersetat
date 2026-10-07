"use client";

import { useEffect } from "react";

const CODE_RE = /^[A-Z2-9]{6}$/;

/** Mémorise le code d'un lien d'invitation (?invite=CODE) pendant 30 jours, jusqu'à la première connexion. */
export function InviteCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invite")?.trim().toUpperCase();
    if (code && CODE_RE.test(code)) {
      document.cookie = `te_ref=${code}; Max-Age=${30 * 86_400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    }
  }, []);
  return null;
}
