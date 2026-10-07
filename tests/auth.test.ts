import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { buildSignInMessage, verifyWalletSignature } from "@/lib/auth/message";
import { signSessionToken, verifySessionToken } from "@/lib/auth/token";

// Paire de clés éphémère générée à chaque exécution : aucune clé en dur.
const keypair = nacl.sign.keyPair();
const wallet = bs58.encode(keypair.publicKey);
const fields = {
  domain: "localhost:3000",
  wallet,
  nonce: "0123456789abcdef0123456789abcdef",
  issuedAt: new Date("2026-10-06T10:00:00Z"),
};

function sign(message: string, secretKey = keypair.secretKey) {
  return bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), secretKey));
}

describe("message de connexion", () => {
  it("est déterministe et contient domaine, wallet, nonce et réseau", () => {
    const msg = buildSignInMessage(fields);
    expect(msg).toBe(buildSignInMessage(fields));
    expect(msg).toContain("localhost:3000");
    expect(msg).toContain(wallet);
    expect(msg).toContain(`Nonce: ${fields.nonce}`);
    expect(msg).toContain("Réseau: devnet");
  });
});

describe("verifyWalletSignature", () => {
  const msg = buildSignInMessage(fields);

  it("accepte la signature du bon wallet", () => {
    expect(verifyWalletSignature(msg, sign(msg), wallet)).toBe(true);
  });

  it("refuse un message modifié (autre nonce)", () => {
    const other = buildSignInMessage({ ...fields, nonce: "f".repeat(32) });
    expect(verifyWalletSignature(other, sign(msg), wallet)).toBe(false);
  });

  it("refuse la signature d'un autre wallet", () => {
    const intrus = nacl.sign.keyPair();
    expect(verifyWalletSignature(msg, sign(msg, intrus.secretKey), wallet)).toBe(false);
  });

  it("refuse une signature mal formée sans planter", () => {
    expect(verifyWalletSignature(msg, "pas-du-base58!", wallet)).toBe(false);
    expect(verifyWalletSignature(msg, bs58.encode(new Uint8Array(10)), wallet)).toBe(false);
  });
});

describe("jeton de session", () => {
  const secret = "s".repeat(40);

  it("aller-retour : renvoie le wallet", async () => {
    const token = await signSessionToken(wallet, secret);
    expect(await verifySessionToken(token, secret)).toBe(wallet);
  });

  it("refuse un jeton signé avec un autre secret", async () => {
    const token = await signSessionToken(wallet, "x".repeat(40));
    expect(await verifySessionToken(token, secret)).toBeNull();
  });

  it("refuse un jeton altéré ou absent", async () => {
    const token = await signSessionToken(wallet, secret);
    expect(await verifySessionToken(`${token}x`, secret)).toBeNull();
    expect(await verifySessionToken(undefined, secret)).toBeNull();
  });

  it("exige un secret d'au moins 32 caractères", async () => {
    await expect(signSessionToken(wallet, "court")).rejects.toThrow();
  });
});
