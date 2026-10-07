"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FOUNDER_WALLET, TREASURY_WALLET, explorerUrl } from "@/lib/solana/config";

/** Bénéficiaire des frais des mèmes créés avant le coffre (anciennes configurations). */
const CLAIMER = FOUNDER_WALLET;
import type { PoolRevenue } from "@/lib/solana/claims";

export type RevenueToken = { mint: string; name: string; ticker: string; pool: string };

const sol = (lamports: bigint) => (Number(lamports) / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 6 });

/** Revenus de la plateforme (frais de trading + frais de création) et encaissement vers la trésorerie. */
export function RevenuePanel({ tokens }: { tokens: RevenueToken[] }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [rows, setRows] = useState<PoolRevenue[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const isTreasury = Boolean(publicKey && CLAIMER && publicKey.equals(CLAIMER));

  const load = useCallback(async () => {
    if (!CLAIMER || tokens.length === 0) return setRows([]);
    try {
      const { loadRevenues } = await import("@/lib/solana/claims");
      setRows(await loadRevenues(connection, tokens.map((t) => t.pool), CLAIMER));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    }
  }, [connection, tokens]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function claim(targets: PoolRevenue[]) {
    if (!publicKey || !CLAIMER) return;
    setError(null);
    try {
      const { buildClaimTxs } = await import("@/lib/solana/claims");
      for (const r of targets) {
        setBusy(r.pool);
        for (const tx of await buildClaimTxs(connection, r, CLAIMER)) {
          const latest = await connection.getLatestBlockhash("confirmed");
          tx.feePayer = publicKey;
          tx.recentBlockhash = latest.blockhash;
          const sig = await sendTransaction(tx, connection);
          await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
          setDone((d) => [sig, ...d]);
        }
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|refus|declin/i.test(msg) ? "Transaction refusée dans le wallet." : msg);
    } finally {
      setBusy(null);
    }
  }

  const claimable = (rows ?? []).filter((r) => r.tradingLamports + r.creationLamports > BigInt(0));
  const total = claimable.reduce((s, r) => s + r.tradingLamports + r.creationLamports, BigInt(0));
  const byPool = new Map(tokens.map((t) => [t.pool, t]));

  return (
    <section className="surface space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Revenus de la plateforme</h2>
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => void load()}>
          Actualiser
        </button>
      </div>

      {TREASURY_WALLET && CLAIMER && !TREASURY_WALLET.equals(CLAIMER) && (
        <p className="rounded-xl border border-ligne bg-white/[0.03] p-3 text-xs text-muted-foreground">
          Les mèmes créés depuis la mise en place du coffre versent leurs frais au coffre multi-signature (
          <a href={explorerUrl("address", TREASURY_WALLET.toBase58())} target="_blank" rel="noreferrer" className="font-mono underline">
            {TREASURY_WALLET.toBase58().slice(0, 4)}…{TREASURY_WALLET.toBase58().slice(-4)}
          </a>
          ) : leur encaissement demande 2 signatures sur 3. Ce panneau gère les mèmes plus anciens.
        </p>
      )}
      {rows === null ? (
        <p className="text-sm text-muted-foreground">Lecture des pools sur la blockchain…</p>
      ) : (
        <>
          <p className="text-sm">
            À encaisser : <span className="font-mono text-lg font-medium text-achat">{sol(total)} SOL</span>
          </p>
          {!isTreasury && (
            <p className="rounded-xl border border-amber-300/30 bg-amber-300/[0.07] p-3 text-xs text-amber-100">
              Pour encaisser, connecte le wallet fondateur ({CLAIMER?.toBase58().slice(0, 4)}…{CLAIMER?.toBase58().slice(-4)}).
            </p>
          )}
          {claimable.length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien à encaisser pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-ligne text-sm">
              {claimable.map((r) => {
                const t = byPool.get(r.pool);
                return (
                  <li key={r.pool} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate">
                        {t?.name} <span className="font-mono text-xs text-pervenche">${t?.ticker}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        trading {sol(r.tradingLamports)} · création {sol(r.creationLamports)} SOL
                      </p>
                    </div>
                    <button type="button" className="btn-ghost shrink-0 px-3 py-1.5 text-xs" disabled={!isTreasury || busy !== null} onClick={() => void claim([r])}>
                      {busy === r.pool ? "Signature…" : "Encaisser"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {claimable.length > 1 && (
            <button type="button" className="btn-primary w-full" disabled={!isTreasury || busy !== null} onClick={() => void claim(claimable)}>
              Tout encaisser ({claimable.length} pools)
            </button>
          )}
        </>
      )}
      {error && <p className="text-sm break-all text-vente">{error}</p>}
      {done.length > 0 && (
        <ul className="space-y-1 text-xs">
          {done.map((sig) => (
            <li key={sig}>
              <a href={explorerUrl("tx", sig)} target="_blank" rel="noreferrer" className="text-achat hover:underline">
                ✓ Encaissé · voir la transaction ↗
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground/80">
        Frais de trading : part plateforme après Meteora (20 %) et créateur. Frais de création : 90 % pour la plateforme. Chaque encaissement est une transaction signée par la trésorerie.
      </p>
    </section>
  );
}
