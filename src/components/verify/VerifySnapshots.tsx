"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { explorerUrl } from "@/lib/solana/config";
import { merkleProof, snapshotHash, verifyProof, type Snapshot } from "@/lib/snapshot";

export type SealedRow = { signature: string; sealedAt: string | null; sha: string; root: string; cid: string; count: number };
type Check = { state: "loading" } | { state: "ok"; mine: string | null } | { state: "ko"; reason: string };

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }) : "—");

/** Vérification dans le navigateur : fichier IPFS → empreinte recalculée → comparaison avec le sceau on-chain. */
export function VerifySnapshots({ snapshots, gatewayPrefix }: { snapshots: SealedRow[]; gatewayPrefix: string }) {
  const { publicKey } = useWallet();
  const [checks, setChecks] = useState<Record<string, Check>>({});

  async function verify(s: SealedRow) {
    setChecks((c) => ({ ...c, [s.signature]: { state: "loading" } }));
    const urls = [`${gatewayPrefix}${s.cid}`, `https://${s.cid}.ipfs.dweb.link/`, `https://ipfs.io/ipfs/${s.cid}`];
    let text: string | null = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (res.ok) {
          text = await res.text();
          break;
        }
      } catch {
        /* passerelle suivante */
      }
    }
    if (text === null) return setChecks((c) => ({ ...c, [s.signature]: { state: "ko", reason: "Fichier IPFS introuvable pour le moment, réessaie plus tard." } }));
    if (snapshotHash(text) !== s.sha) return setChecks((c) => ({ ...c, [s.signature]: { state: "ko", reason: "L'empreinte ne correspond pas : fichier altéré." } }));
    let mine: string | null = null;
    if (publicKey) {
      const snap = JSON.parse(text) as Snapshot;
      const entry = snap.entries.find((e) => e.wallet === publicKey.toBase58());
      const proof = entry && merkleProof(snap.entries, entry.wallet);
      mine = entry && proof && verifyProof(entry, proof, s.root) ? `Tes ${entry.points.toLocaleString("fr-FR")} points y figurent, preuve valide.` : "Ton wallet ne figure pas dans cet instantané.";
    }
    setChecks((c) => ({ ...c, [s.signature]: { state: "ok", mine } }));
  }

  if (snapshots.length === 0) {
    return <p className="surface p-6 text-sm text-muted-foreground">Aucun instantané scellé pour l&apos;instant. Le premier arrive bientôt.</p>;
  }
  return (
    <ul className="surface divide-y divide-ligne text-sm">
      {snapshots.map((s) => {
        const c = checks[s.signature];
        return (
          <li key={s.signature} className="space-y-2 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {date(s.sealedAt)} · {s.count} compte{s.count > 1 ? "s" : ""}
                </p>
                <p className="font-mono text-xs text-muted-foreground">empreinte {s.sha.slice(0, 16)}…</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={explorerUrl("tx", s.signature)} target="_blank" rel="noreferrer" className="chip">
                  Sceau on-chain ↗
                </a>
                <button type="button" className="btn-ghost px-3 py-1 text-xs" disabled={c?.state === "loading"} onClick={() => void verify(s)}>
                  {c?.state === "loading" ? "Vérification…" : "Vérifier"}
                </button>
              </div>
            </div>
            {c?.state === "ok" && (
              <p className="text-xs text-achat">
                ✓ Le fichier publié correspond exactement au sceau inscrit sur la blockchain.{c.mine && ` ${c.mine}`}
              </p>
            )}
            {c?.state === "ko" && <p className="text-xs text-vente">{c.reason}</p>}
          </li>
        );
      })}
    </ul>
  );
}
