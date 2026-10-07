import nacl from "tweetnacl";
import bs58 from "bs58";

export type SignInFields = {
  domain: string;
  wallet: string;
  nonce: string;
  issuedAt: Date;
};

/**
 * Message lisible signé par le wallet (format inspiré de Sign-In With Solana).
 * Le serveur le reconstruit à l'identique à partir du nonce stocké :
 * le client n'envoie jamais le texte, seulement la signature.
 */
export function buildSignInMessage({ domain, wallet, nonce, issuedAt }: SignInFields): string {
  return [
    `${domain} vous demande de vous connecter avec votre compte Solana :`,
    wallet,
    "",
    "Citoyen, signez pour entrer sur Tiers-État. Cette signature ne coûte rien et n'autorise aucune transaction.",
    "",
    `URI: https://${domain}`,
    "Réseau: devnet",
    `Nonce: ${nonce}`,
    `Émis le: ${issuedAt.toISOString()}`,
  ].join("\n");
}

/** Vérifie une signature ed25519 (base58) d'un message par une clé publique (base58). */
export function verifyWalletSignature(message: string, signatureB58: string, wallet: string): boolean {
  try {
    const signature = bs58.decode(signatureB58);
    const publicKey = bs58.decode(wallet);
    if (signature.length !== 64 || publicKey.length !== 32) return false;
    return nacl.sign.detached.verify(new TextEncoder().encode(message), signature, publicKey);
  } catch {
    return false;
  }
}
