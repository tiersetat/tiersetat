"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import type { Profile } from "@/lib/auth/types";

type Status = "loading" | "anonymous" | "signing" | "signed";

type SessionContextValue = {
  profile: Profile | null;
  status: Status;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
  return data as T;
}

async function fetchMe(): Promise<Profile | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await res.json();
    return data.profile ?? null;
  } catch {
    return null;
  }
}

/** Session « citoyen » : le wallet signe un message, le serveur pose un cookie httpOnly. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const applyMe = useCallback((p: Profile | null) => {
    setProfile(p);
    setStatus(p ? "signed" : "anonymous");
  }, []);

  const refresh = useCallback(async () => {
    applyMe(await fetchMe());
  }, [applyMe]);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((p) => {
      if (!cancelled) applyMe(p);
    });
    return () => {
      cancelled = true;
    };
  }, [applyMe]);

  const signOut = useCallback(async () => {
    await postJson("/api/auth/logout").catch(() => undefined);
    setProfile(null);
    setStatus("anonymous");
  }, []);

  // Session liée à UN wallet : si l'utilisateur change de wallet, elle ne vaut plus
  // côté interface, et on ferme le cookie côté serveur.
  const wallet = publicKey?.toBase58();
  const walletMismatch = Boolean(profile && connected && wallet && wallet !== profile.wallet);
  useEffect(() => {
    if (walletMismatch) void fetch("/api/auth/logout", { method: "POST" });
  }, [walletMismatch]);

  const signIn = useCallback(async () => {
    if (!wallet || !signMessage) {
      setError("Ce wallet ne permet pas de signer de message.");
      return;
    }
    setError(null);
    setStatus("signing");
    try {
      const { nonce, message } = await postJson<{ nonce: string; message: string }>(
        "/api/auth/nonce",
        { wallet },
      );
      const signature = await signMessage(new TextEncoder().encode(message));
      const { profile } = await postJson<{ profile: Profile }>("/api/auth/verify", {
        wallet,
        nonce,
        signature: bs58.encode(signature),
      });
      setProfile(profile);
      setStatus("signed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|refus|declin/i.test(msg) ? "Signature refusée dans le wallet." : msg);
      setStatus("anonymous");
    }
  }, [wallet, signMessage]);

  return (
    <SessionContext.Provider
      value={{
        profile: walletMismatch ? null : profile,
        status: walletMismatch ? "anonymous" : status,
        error,
        signIn,
        signOut,
        refresh,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession doit être utilisé dans <SessionProvider>");
  return ctx;
}
