import "server-only";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Profile } from "./types";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./token";

export type { Profile };

export async function setSessionCookie(wallet: string) {
  const token = await signSessionToken(wallet, serverEnv.sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Wallet de la session courante (cookie signé), ou null. */
export async function getSessionWallet(): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, secret);
}

/** Profil de la session courante, rôle lu en base (jamais depuis le cookie). */
export async function getSessionProfile(): Promise<Profile | null> {
  const wallet = await getSessionWallet();
  if (!wallet) return null;
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("wallet, pseudo, avatar_url, bio, role")
    .eq("wallet", wallet)
    .maybeSingle<Profile>();
  return data;
}

export async function requireAdmin(): Promise<Profile | null> {
  const profile = await getSessionProfile();
  return profile?.role === "admin" ? profile : null;
}
