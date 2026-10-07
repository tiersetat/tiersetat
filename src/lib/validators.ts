import { z } from "zod";

/** Adresse Solana en base58 (même règle que public.is_solana_address en SQL). */
export const solanaAddress = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Adresse Solana invalide");

export const nonceRequestSchema = z.object({ wallet: solanaAddress });

export const verifyRequestSchema = z.object({
  wallet: solanaAddress,
  nonce: z.string().regex(/^[0-9a-f]{32}$/, "Nonce invalide"),
  /** Signature ed25519 encodée en base58 */
  signature: z.string().min(64).max(100),
});

const byteLength = (s: string) => new TextEncoder().encode(s).length;

const optionalUrl = (hosts: RegExp | null, message: string, max = 200) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return u.protocol === "https:" && (!hosts || hosts.test(u.hostname));
      } catch {
        return false;
      }
    }, message);

/** Champs texte du formulaire « Frapper un mème » (limites Metaplex : nom 32 octets, symbole 10). */
export const launchFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Donne un nom à ton mème")
    .refine((v) => byteLength(v) <= 32, "Nom trop long (32 caractères max, les accents comptent double)"),
  ticker: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase().replace(/^\$/, ""))
    .pipe(z.string().regex(/^[A-Z0-9]{2,10}$/, "Ticker : 2 à 10 lettres ou chiffres, sans espace")),
  description: z.string().trim().max(500, "Description : 500 caractères max").optional().default(""),
  twitter: optionalUrl(/^(www\.)?(x|twitter)\.com$/, "Lien X invalide (https://x.com/…)"),
  website: optionalUrl(null, "Lien de site invalide (doit commencer par https://)"),
  source: optionalUrl(null, "Lien source invalide", 600),
});
export type LaunchFields = z.infer<typeof launchFieldsSchema>;

export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

export const registerTokenSchema = z.object({
  signature: z.string().min(64).max(100),
  mint: solanaAddress,
  source: z.string().url().max(600).optional(),
});

/** Pseudo : 3 à 24 lettres (accents compris), chiffres, « _ », « . » ou « - » (même règle qu'en base). */
export const pseudoSchema = z
  .string()
  .trim()
  .regex(/^[\p{L}\p{N}_.-]{3,24}$/u, "Pseudo : 3 à 24 lettres, chiffres, « _ », « . » ou « - », sans espace");

export const profileUpdateSchema = z.object({
  pseudo: z.union([pseudoSchema, z.literal("")]).optional(),
  bio: z.string().trim().max(280, "Bio : 280 caractères max").optional(),
});

export const followSchema = z.object({ wallet: solanaAddress });
