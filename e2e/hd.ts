import { hmac } from "@noble/hashes/hmac.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { mnemonicToSeedSync } from "@scure/bip39";
import { Keypair } from "@solana/web3.js";

/** Dérivation SLIP-0010 ed25519, chemin Phantom m/44'/501'/0'/0'. */
export function phantomKeypair(mnemonic: string): Keypair {
  let I = hmac(sha512, new TextEncoder().encode("ed25519 seed"), mnemonicToSeedSync(mnemonic));
  for (const index of [44, 501, 0, 0]) {
    const data = new Uint8Array(37);
    data.set(I.slice(0, 32), 1);
    new DataView(data.buffer).setUint32(33, (index | 0x80000000) >>> 0);
    I = hmac(sha512, I.slice(32), data);
  }
  return Keypair.fromSeed(I.slice(0, 32));
}
