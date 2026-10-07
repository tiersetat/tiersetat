import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { rankedCahiers } from "@/lib/cahiers-data";
import { pinFile } from "@/lib/ipfs";
import { buildSnapshot, merkleRoot, serializeSnapshot, snapshotHash, snapshotMemo } from "@/lib/snapshot";

/**
 * Prépare un instantané des points : classement complet figé, publié sur IPFS.
 * Le scellement (mémo on-chain) est ensuite signé par le wallet du fondateur, côté navigateur :
 * le serveur ne détient aucune clé.
 */
export async function POST() {
  try {
    if (!(await requireAdmin())) return jsonError(403, "Réservé aux administrateurs.");
    const ranked = await rankedCahiers();
    if (!ranked) return jsonError(503, "Les Cahiers ne sont pas encore disponibles.");

    const snapshot = buildSnapshot(
      ranked.map((c) => ({ wallet: c.wallet, points: c.points })),
      new Date().toISOString(),
    );
    const text = serializeSnapshot(snapshot);
    const sha = snapshotHash(text);
    const root = merkleRoot(snapshot.entries);
    const cid = await pinFile(new Blob([text], { type: "application/json" }), `cahiers-${snapshot.takenAt.slice(0, 10)}-${sha.slice(0, 8)}.json`);
    return NextResponse.json({ sha, root, cid, count: snapshot.entries.length, memo: snapshotMemo(sha, root, cid, snapshot.entries.length) });
  } catch (err) {
    return handleApiError(err);
  }
}
