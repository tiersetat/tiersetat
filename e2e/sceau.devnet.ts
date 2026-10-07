import fs from "node:fs";
import { expect, it } from "vitest";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";

/** Chaîne complète de la preuve des points (wallet de test à la place du fondateur). RUN_SCEAU=1 COFFRE_PAYER=… */
it.skipIf(process.env.RUN_SCEAU !== "1")("publie, scelle, retrouve et vérifie un instantané", { timeout: 5 * 60_000 }, async () => {
  const { pinFile } = await import("@/lib/ipfs");
  const { buildSnapshot, merkleProof, merkleRoot, parseSnapshotMemo, serializeSnapshot, snapshotHash, snapshotMemo, verifyProof } = await import("@/lib/snapshot");
  const connection = new Connection(process.env.SOLANA_RPC_URL as string, "confirmed");
  const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.COFFRE_PAYER as string, "utf8"))));

  const snap = buildSnapshot([{ wallet: "TestA", points: 1200 }, { wallet: "TestB", points: 350 }], new Date().toISOString());
  const text = serializeSnapshot(snap);
  const sha = snapshotHash(text);
  const root = merkleRoot(snap.entries);
  const cid = await pinFile(new Blob([text], { type: "application/json" }), `cahiers-test-${sha.slice(0, 8)}.json`);
  const memo = snapshotMemo(sha, root, cid, snap.entries.length);
  const sig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(new TransactionInstruction({ programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }], data: Buffer.from(memo) })),
    [signer],
    { commitment: "confirmed" },
  );

  // Relecture comme le fait le site : depuis l'historique on-chain du signataire
  const found = (await connection.getSignaturesForAddress(signer.publicKey, { limit: 5 })).find((s) => s.signature === sig);
  const parsed = parseSnapshotMemo(found?.memo ?? "");
  expect(parsed).toEqual({ sha, root, cid, count: 2 });

  // Vérification comme le navigateur : fichier IPFS → empreinte
  const gw = `https://${process.env.PINATA_GATEWAY}/ipfs/${cid}`;
  const fetched = await (await fetch(gw)).text();
  expect(snapshotHash(fetched)).toBe(sha);
  expect(verifyProof(snap.entries[1], merkleProof(snap.entries, "TestB")!, root)).toBe(true);
  console.log("SCEAU OK", sig.slice(0, 16), cid);
});
