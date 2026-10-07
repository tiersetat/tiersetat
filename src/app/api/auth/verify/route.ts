import { NextResponse, type NextRequest } from "next/server";
import { buildSignInMessage, verifyWalletSignature } from "@/lib/auth/message";
import { setSessionCookie } from "@/lib/auth/session";
import type { Profile } from "@/lib/auth/types";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyRequestSchema } from "@/lib/validators";
import { INVITE_COOKIE, parseInviteCode } from "@/lib/invite";

/** Étape 2/2 : vérifie la signature, consomme le nonce, ouvre la session. */
export async function POST(req: NextRequest) {
  try {
    const { wallet, nonce, signature } = verifyRequestSchema.parse(await req.json());
    const db = supabaseAdmin();

    // Consommation atomique : un nonce ne sert qu'une fois, avant expiration.
    const { data: row, error } = await db
      .from("auth_nonces")
      .update({ used_at: new Date().toISOString() })
      .eq("nonce", nonce)
      .eq("wallet", wallet)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("domain, issued_at")
      .maybeSingle<{ domain: string; issued_at: string }>();
    if (error) throw error;
    if (!row) return jsonError(401, "Demande de connexion expirée, recommence.");
    if (row.domain !== req.headers.get("host")) {
      return jsonError(401, "Domaine de connexion inattendu.");
    }

    const message = buildSignInMessage({
      domain: row.domain,
      wallet,
      nonce,
      issuedAt: new Date(row.issued_at),
    });
    if (!verifyWalletSignature(message, signature, wallet)) {
      return jsonError(401, "Signature invalide.");
    }

    const { error: upsertError } = await db
      .from("profiles")
      .upsert({ wallet }, { onConflict: "wallet", ignoreDuplicates: true });
    if (upsertError) throw upsertError;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("wallet, pseudo, avatar_url, bio, role")
      .eq("wallet", wallet)
      .single<Profile>();
    if (profileError) throw profileError;

    // Parrainage : uniquement pour un compte créé il y a moins de 24 h, une seule fois, jamais soi-même
    const inviteCode = parseInviteCode(req.cookies.get(INVITE_COOKIE)?.value);
    if (inviteCode) {
      const { data: referrer } = await db.from("profiles").select("wallet").eq("invite_code", inviteCode).maybeSingle<{ wallet: string }>();
      if (referrer && referrer.wallet !== wallet) {
        await db
          .from("profiles")
          .update({ referred_by: referrer.wallet })
          .eq("wallet", wallet)
          .is("referred_by", null)
          .gt("created_at", new Date(Date.now() - 86_400_000).toISOString());
      }
    }

    await setSessionCookie(wallet);
    const res = NextResponse.json({ profile });
    if (inviteCode) res.cookies.delete(INVITE_COOKIE);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
