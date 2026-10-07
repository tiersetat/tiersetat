import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "te_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

const ISSUER = "tiersetat";

function key(secret: string) {
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET doit faire au moins 32 caractères.");
  }
  return new TextEncoder().encode(secret);
}

/** Jeton de session signé (HS256) : ne contient que l'adresse du wallet. */
export async function signSessionToken(wallet: string, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(wallet)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key(secret));
}

/** Renvoie le wallet de la session, ou null si le jeton est absent, expiré ou falsifié. */
export async function verifySessionToken(token: string | undefined, secret: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
