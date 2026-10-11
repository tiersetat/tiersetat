"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { PRIVY_APP_ID } from "@/components/providers/PrivyBridge";
import { enableDemo } from "@/lib/demo";

/**
 * Comptes de démonstration (vidéos) : le mode démo s'active tout seul quand ils sont connectés.
 * Seule l'empreinte SHA-256 de l'adresse e-mail est stockée dans le code (public), jamais l'adresse elle-même.
 */
const DEMO_ACCOUNTS = new Set(["61f41e50329e3499f199b575db53ebb515fa16af4a7fbb72193fcf2d20f819cd"]);

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text.trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function Inner() {
  const { user, authenticated } = usePrivy();
  const email = user?.email?.address ?? user?.google?.email ?? null;
  useEffect(() => {
    if (!authenticated || !email) return;
    void sha256(email).then((h) => DEMO_ACCOUNTS.has(h) && enableDemo());
  }, [authenticated, email]);
  return null;
}

export function DemoAccount() {
  return PRIVY_APP_ID ? <Inner /> : null;
}
