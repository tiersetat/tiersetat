import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildSignInMessage } from "@/lib/auth/message";
import { handleApiError, jsonError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase/server";
import { nonceRequestSchema } from "@/lib/validators";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";

const NONCE_TTL_MS = 5 * 60 * 1000;

/** Étape 1/2 de la connexion : génère un nonce à usage unique et le message à signer. */
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`nonce:${clientIp(req.headers)}`, 20, 10 * 60_000)) return tooMany(10);
    const { wallet } = nonceRequestSchema.parse(await req.json());
    const domain = req.headers.get("host");
    if (!domain) return jsonError(400, "En-tête Host manquant");

    const nonce = randomBytes(16).toString("hex");
    const issuedAt = new Date();
    const db = supabaseAdmin();

    // Ménage opportuniste des nonces expirés
    await db.from("auth_nonces").delete().lt("expires_at", new Date().toISOString());

    const { error } = await db.from("auth_nonces").insert({
      nonce,
      wallet,
      domain,
      issued_at: issuedAt.toISOString(),
      expires_at: new Date(issuedAt.getTime() + NONCE_TTL_MS).toISOString(),
    });
    if (error) throw error;

    return NextResponse.json({
      nonce,
      message: buildSignInMessage({ domain, wallet, nonce, issuedAt }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
