import { describe, expect, it } from "vitest";
import { decodeMetaplexMetadata } from "@/lib/solana/metadata";
import { sniffImageType } from "@/lib/image";
import { launchFieldsSchema } from "@/lib/validators";
import { grindMintKeypair } from "@/lib/solana/launch";

function borshString(s: string, padTo: number) {
  const bytes = new TextEncoder().encode(s);
  const out = new Uint8Array(4 + padTo);
  new DataView(out.buffer).setUint32(0, padTo, true);
  out.set(bytes, 4);
  return out;
}

describe("decodeMetaplexMetadata", () => {
  it("lit nom, symbole et URI en retirant le remplissage", () => {
    const parts = [new Uint8Array(65), borshString("La Baguette", 32), borshString("BAG", 10), borshString("https://x/ipfs/abc", 200)];
    const data = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { data.set(p, o); o += p.length; }
    expect(decodeMetaplexMetadata(data)).toEqual({ name: "La Baguette", symbol: "BAG", uri: "https://x/ipfs/abc" });
  });

  it("refuse des données tronquées", () => {
    expect(() => decodeMetaplexMetadata(new Uint8Array(70))).toThrow();
  });
});

describe("sniffImageType", () => {
  it("reconnaît PNG / JPEG / GIF / WebP par leurs octets magiques", () => {
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBe("image/gif");
    expect(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });
  it("refuse un faux fichier image", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("launchFieldsSchema", () => {
  it("normalise le ticker et accepte un formulaire minimal", () => {
    const r = launchFieldsSchema.parse({ name: "Égalité", ticker: "$baguette" });
    expect(r.ticker).toBe("BAGUETTE");
    expect(r.description).toBe("");
  });
  it("limite le nom à 32 octets (accents comptés double)", () => {
    expect(launchFieldsSchema.safeParse({ name: "é".repeat(17), ticker: "AB" }).success).toBe(false);
  });
  it("n'accepte que des liens X en https", () => {
    expect(launchFieldsSchema.safeParse({ name: "a", ticker: "AB", twitter: "https://x.com/tiersetat" }).success).toBe(true);
    expect(launchFieldsSchema.safeParse({ name: "a", ticker: "AB", twitter: "https://evil.com" }).success).toBe(false);
    expect(launchFieldsSchema.safeParse({ name: "a", ticker: "AB", website: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("grindMintKeypair", () => {
  it("produit une adresse se terminant par le suffixe demandé", () => {
    expect(grindMintKeypair("F", 5000).publicKey.toBase58().endsWith("F")).toBe(true);
  });
});
