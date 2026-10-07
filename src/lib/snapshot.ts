/**
 * Instantanés des Cahiers de doléances (pur, testé) : liste figée des points, empreinte SHA-256
 * et racine de Merkle, destinées à être scellées sur la blockchain.
 */
import { sha256 } from "@noble/hashes/sha2.js";

export const SNAPSHOT_PREFIX = "tiersetat:cahiers:v1";

export type SnapshotEntry = { wallet: string; points: number };
export type Snapshot = { version: 1; network: string; takenAt: string; entries: SnapshotEntry[] };

const enc = new TextEncoder();
export const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** Ordre canonique : points décroissants, puis adresse. Le même contenu donne toujours le même texte. */
export function buildSnapshot(entries: SnapshotEntry[], takenAt: string, network = "devnet"): Snapshot {
  const clean = entries
    .filter((e) => e.points > 0)
    .map((e) => ({ wallet: e.wallet, points: Math.floor(e.points) }))
    .sort((a, b) => b.points - a.points || a.wallet.localeCompare(b.wallet));
  return { version: 1, network, takenAt, entries: clean };
}

/** Texte exact publié sur IPFS (clés dans un ordre fixe, sans espaces). */
export function serializeSnapshot(s: Snapshot): string {
  return JSON.stringify({ version: s.version, network: s.network, takenAt: s.takenAt, entries: s.entries.map((e) => ({ wallet: e.wallet, points: e.points })) });
}

export function snapshotHash(text: string): string {
  return hex(sha256(enc.encode(text)));
}

/** Feuille de Merkle d'un compte : sha256("adresse:points"). */
export function leafOf(e: SnapshotEntry): Uint8Array {
  return sha256(enc.encode(`${e.wallet}:${e.points}`));
}

function hashPair(a: Uint8Array, b: Uint8Array): Uint8Array {
  // Paires triées : la preuve n'a pas besoin de connaître la position gauche/droite
  const [x, y] = hex(a) <= hex(b) ? [a, b] : [b, a];
  const buf = new Uint8Array(64);
  buf.set(x, 0);
  buf.set(y, 32);
  return sha256(buf);
}

export function merkleRoot(entries: SnapshotEntry[]): string {
  let level = entries.map(leafOf);
  if (level.length === 0) return hex(sha256(new Uint8Array()));
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]);
    level = next;
  }
  return hex(level[0]);
}

/** Preuve de Merkle d'un compte : les hachés voisins, de la feuille vers la racine. */
export function merkleProof(entries: SnapshotEntry[], wallet: string): string[] | null {
  let index = entries.findIndex((e) => e.wallet === wallet);
  if (index < 0) return null;
  let level = entries.map(leafOf);
  const proof: string[] = [];
  while (level.length > 1) {
    const sibling = index % 2 === 0 ? index + 1 : index - 1;
    if (sibling < level.length) proof.push(hex(level[sibling]));
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]);
    level = next;
    index = Math.floor(index / 2);
  }
  return proof;
}

export function verifyProof(entry: SnapshotEntry, proof: string[], root: string): boolean {
  const fromHex = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));
  return hex(proof.reduce((acc, p) => hashPair(acc, fromHex(p)), leafOf(entry))) === root;
}

export function snapshotMemo(sha: string, root: string, cid: string, count: number): string {
  return `${SNAPSHOT_PREFIX} sha256=${sha} merkle=${root} ipfs=${cid} n=${count}`;
}

export function parseSnapshotMemo(memo: string): { sha: string; root: string; cid: string; count: number } | null {
  const m = memo.match(/tiersetat:cahiers:v1 sha256=([0-9a-f]{64}) merkle=([0-9a-f]{64}) ipfs=([A-Za-z0-9]+) n=(\d+)/);
  return m ? { sha: m[1], root: m[2], cid: m[3], count: Number(m[4]) } : null;
}
