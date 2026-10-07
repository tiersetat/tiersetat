"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { explorerUrl } from "@/lib/solana/config";

export type EarningToken = { mint: string; name: string; ticker: string; pool: string };

const sol = (lamports: bigint) => (Number(lamports) / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 6 });

/**
 * « Mes revenus de créateur » : part des frais de trading revenant au créateur,
 * lue sur la blockchain et encaissable vers son wallet. Visible seulement par le créateur connecté.
 */
export function CreatorEarnings({ creator, tokens, compact = false }: { creator: string; tokens: EarningToken[]; compact?: boolean }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [earnings, setEarnings] = useState<Map<string, bigint> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const isCreator = publicKey?.toBase58() === creator;

  const load = useCallback(async () => {
    try {
      const { loadCreatorEarnings } = await import("@/lib/solana/creator-claims");
      setEarnings(await loadCreatorEarnings(connection, tokens.map((t) => t.pool)));
    } catch {
      setEarnings(new Map());
    }
  }, [connection, tokens]);

  useEffect(() => {
    if (!isCreator) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [isCreator, load]);

  if (!isCreator || tokens.length === 0) return null;

  const claimable = tokens.filter((t) => (earnings?.get(t.pool) ?? BigInt(0)) > BigInt(0));
  const total = claimable.reduce((s, t) => s + (earnings?.get(t.pool) ?? BigInt(0)), BigInt(0));

  async function claimAll() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const { buildCreatorClaimTx } = await import("@/lib/solana/creator-claims");
      for (const t of claimable) {
        const tx = await buildCreatorClaimTx(connection, publicKey, t.pool, earnings!.get(t.pool)!);
        const latest = await connection.getLatestBlockhash("confirmed");
        tx.feePayer = publicKey;
        tx.recentBlockhash = latest.blockhash;
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
        setDone((d) => [sig, ...d]);
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|refus|declin/i.test(msg) ? "Transaction refusée dans le wallet." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`surface space-y-3 ${compact ? "p-5" : "p-6"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Mes revenus de créateur</h2>
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => void load()}>
          Actualiser
        </button>
      </div>
      {earnings === null ? (
        <p className="text-sm text-muted-foreground">Lecture sur la blockchain…</p>
      ) : (
        <>
          <p className="text-sm">
            À encaisser : <span className="font-mono text-lg font-medium text-achat">{sol(total)} SOL</span>
          </p>
          {!compact && claimable.length > 0 && (
            <ul className="divide-y divide-ligne text-sm">
              {claimable.map((t) => (
                <li key={t.pool} className="flex justify-between py-2">
                  <span className="truncate">
                    {t.name} <span className="font-mono text-xs text-pervenche">${t.ticker}</span>
                  </span>
                  <span className="font-mono text-xs">{sol(earnings.get(t.pool)!)} SOL</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn-primary w-full" disabled={busy || total === BigInt(0)} onClick={() => void claimAll()}>
            {busy ? "Signature…" : total === BigInt(0) ? "Rien à encaisser pour l'instant" : `Encaisser ${sol(total)} SOL`}
          </button>
        </>
      )}
      {error && <p className="text-sm break-all text-vente">{error}</p>}
      {done.map((sig) => (
        <a key={sig} href={explorerUrl("tx", sig)} target="_blank" rel="noreferrer" className="block text-xs text-achat hover:underline">
          ✓ Encaissé · voir la transaction ↗
        </a>
      ))}
      <p className="text-[11px] text-muted-foreground/80">Tu touches une part des frais de trading de tes tokens (70 % après Meteora pour les nouveaux tokens), à chaque achat et vente.</p>
    </section>
  );
}
