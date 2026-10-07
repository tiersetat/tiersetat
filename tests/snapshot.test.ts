import { describe, expect, it } from "vitest";
import { buildSnapshot, merkleProof, merkleRoot, parseSnapshotMemo, serializeSnapshot, snapshotHash, snapshotMemo, verifyProof } from "@/lib/snapshot";

const entries = [
  { wallet: "Bbb", points: 150 },
  { wallet: "Aaa", points: 150 },
  { wallet: "Ccc", points: 900.7 },
  { wallet: "Zero", points: 0 },
  { wallet: "Ddd", points: 10 },
];

describe("instantané", () => {
  const s = buildSnapshot(entries, "2026-10-07T00:00:00Z");
  it("ordre canonique, sans comptes à zéro, points entiers", () => {
    expect(s.entries).toEqual([{ wallet: "Ccc", points: 900 }, { wallet: "Aaa", points: 150 }, { wallet: "Bbb", points: 150 }, { wallet: "Ddd", points: 10 }]);
  });
  it("même contenu → même empreinte ; un point de plus → empreinte différente", () => {
    const h = snapshotHash(serializeSnapshot(s));
    expect(snapshotHash(serializeSnapshot(buildSnapshot([...entries].reverse(), "2026-10-07T00:00:00Z")))).toBe(h);
    expect(snapshotHash(serializeSnapshot(buildSnapshot([...entries, { wallet: "Ddd", points: 11 }].slice(1), "2026-10-07T00:00:00Z")))).not.toBe(h);
  });
  it("preuve de Merkle valide pour chaque compte, invalide si on triche", () => {
    const root = merkleRoot(s.entries);
    for (const e of s.entries) expect(verifyProof(e, merkleProof(s.entries, e.wallet)!, root)).toBe(true);
    expect(verifyProof({ wallet: "Ddd", points: 9999 }, merkleProof(s.entries, "Ddd")!, root)).toBe(false);
    expect(merkleProof(s.entries, "Inconnu")).toBeNull();
  });
  it("mémo lisible et relisible", () => {
    expect(parseSnapshotMemo(snapshotMemo("a".repeat(64), "b".repeat(64), "QmVo5qyqFzP1", 2))?.cid).toBe("QmVo5qyqFzP1");
    const memo = snapshotMemo("a".repeat(64), "b".repeat(64), "bafyabc", 4);
    expect(parseSnapshotMemo(`[120] ${memo}`)).toEqual({ sha: "a".repeat(64), root: "b".repeat(64), cid: "bafyabc", count: 4 });
  });
});
