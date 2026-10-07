import { randomInt } from "node:crypto";

/** Alphabet sans caractères ambigus (pas de 0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_RE = /^[A-Z2-9]{6}$/;
export const INVITE_COOKIE = "te_ref";

export function newInviteCode(): string {
  return Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** Normalise un code saisi ou lu dans une URL ; null s'il est invalide. */
export function parseInviteCode(value: unknown): string | null {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return INVITE_CODE_RE.test(code) ? code : null;
}
