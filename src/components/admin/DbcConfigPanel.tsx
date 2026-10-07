"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { DBC_CONFIG, TREASURY_WALLET, explorerUrl } from "@/lib/solana/config";
import { PLATFORM_CURVE } from "@/lib/solana/curve";

type ConfigState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ok"; thresholdSol: number; feeClaimer: string; creatorPct: number; creationFeeSol: number; upToDate: boolean }
  | { kind: "missing" };

/** Création de la config Meteora DBC (et d'une nouvelle quand les paramètres changent), signée par le wallet admin. */
export function DbcConfigPanel() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ config: string; signature: string } | null>(null);
  const [current, setCurrent] = useState<ConfigState>(DBC_CONFIG ? { kind: "loading" } : { kind: "none" });

  // Vérifie on-chain la config déclarée dans NEXT_PUBLIC_DBC_CONFIG
  useEffect(() => {
    if (!DBC_CONFIG) return;
    let cancelled = false;
    import("@/lib/solana/dbc")
      .then(({ dbcClient }) => dbcClient(connection).state.getPoolConfig(DBC_CONFIG!))
      .then((cfg) => {
        if (cancelled) return;
        if (!cfg) return setCurrent({ kind: "missing" });
        const creatorPct = Number(cfg.creatorTradingFeePercentage);
        const creationFeeSol = Number(cfg.poolCreationFee.toString()) / 1e9;
        setCurrent({
          kind: "ok",
          thresholdSol: Number(cfg.migrationQuoteThreshold.toString()) / 1e9,
          feeClaimer: cfg.feeClaimer.toBase58(),
          creatorPct,
          creationFeeSol,
          // La config on-chain correspond-elle aux paramètres actuels du code ?
          upToDate:
            creatorPct === PLATFORM_CURVE.creatorTradingFeePercentage &&
            Math.abs(creationFeeSol - PLATFORM_CURVE.poolCreationFeeSol) < 1e-9 &&
            cfg.feeClaimer.toBase58() === TREASURY_WALLET?.toBase58(),
        });
      })
      .catch(() => !cancelled && setCurrent({ kind: "missing" }));
    return () => {
      cancelled = true;
    };
  }, [connection]);

  async function createConfig() {
    if (!publicKey || !TREASURY_WALLET) return;
    setBusy(true);
    setError(null);
    try {
      const { buildCreateConfigTx } = await import("@/lib/solana/dbc");
      const { tx, configKeypair } = await buildCreateConfigTx(connection, publicKey, TREASURY_WALLET);
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = publicKey;
      tx.recentBlockhash = latest.blockhash;
      const signature = await sendTransaction(tx, connection, { signers: [configKeypair] });
      await connection.confirmTransaction({ signature, ...latest }, "confirmed");
      setCreated({ config: configKeypair.publicKey.toBase58(), signature });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/reject|refus|declin/i.test(msg) ? "Transaction refusée dans le wallet." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface space-y-4 p-6">
      <h2 className="font-semibold">Config de la bonding curve</h2>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Offre totale</dt>
        <dd>{PLATFORM_CURVE.totalSupply.toLocaleString("fr-FR")} tokens</dd>
        <dt className="text-muted-foreground">Market cap départ</dt>
        <dd>{PLATFORM_CURVE.initialMarketCapSol} SOL</dd>
        <dt className="text-muted-foreground">Migration DEX</dt>
        <dd>{PLATFORM_CURVE.migrationMarketCapSol} SOL de market cap → DAMM v2</dd>
        <dt className="text-muted-foreground">Frais de trading</dt>
        <dd>
          {PLATFORM_CURVE.tradingFeeBps / 100} % (créateur : {PLATFORM_CURVE.creatorTradingFeePercentage} % après Meteora)
        </dd>
        <dt className="text-muted-foreground">Frais de création</dt>
        <dd>{PLATFORM_CURVE.poolCreationFeeSol} SOL</dd>
        <dt className="text-muted-foreground">Trésorerie</dt>
        <dd className="break-all">{TREASURY_WALLET?.toBase58() ?? "⚠ NEXT_PUBLIC_TREASURY_WALLET manquant"}</dd>
      </dl>

      {current.kind === "ok" && (
        <p className="rounded-xl border border-achat/30 bg-achat/10 p-3 text-sm">
          ✅ Config active :{" "}
          <a className="font-mono break-all underline" href={explorerUrl("address", DBC_CONFIG!.toBase58())} target="_blank" rel="noreferrer">
            {DBC_CONFIG!.toBase58()}
          </a>
          <br />
          Seuil de migration : <strong>{current.thresholdSol.toFixed(2)} SOL</strong> · créateur {current.creatorPct} % · création{" "}
          {current.creationFeeSol} SOL · frais versés à <span className="font-mono">{current.feeClaimer.slice(0, 6)}…</span>
        </p>
      )}
      {current.kind === "ok" && !current.upToDate && !created && (
        <p className="rounded-xl border border-amber-300/30 bg-amber-300/[0.07] p-3 text-sm text-amber-100">
          Les paramètres ont changé depuis la création de cette config (part créateur, frais de création ou trésorerie). Crée une
          nouvelle config : les nouveaux tokens l&apos;utiliseront, les anciens restent échangeables.
        </p>
      )}
      {current.kind === "loading" && <p className="text-sm">Vérification de la config on-chain…</p>}
      {current.kind === "missing" && (
        <p className="text-sm text-vente">
          ⚠ NEXT_PUBLIC_DBC_CONFIG ne correspond à aucune config DBC sur le devnet.
        </p>
      )}

      {created ? (
        <div className="space-y-2 rounded-xl border border-ligne bg-white/[0.03] p-3 text-sm">
          <p className="font-bold">Config créée ! Mets à jour .env.local (et Vercel), puis redémarre :</p>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-2 font-mono text-xs">
            {`NEXT_PUBLIC_DBC_CONFIG=${created.config}`}
            {DBC_CONFIG && `\nNEXT_PUBLIC_DBC_LEGACY_CONFIGS=${DBC_CONFIG.toBase58()}`}
          </pre>
          <a className="underline" href={explorerUrl("tx", created.signature)} target="_blank" rel="noreferrer">
            Voir la transaction sur Solscan (devnet)
          </a>
        </div>
      ) : (
        (current.kind !== "ok" || !current.upToDate) && (
          <button
            type="button"
            onClick={() => void createConfig()}
            disabled={busy || !publicKey || !TREASURY_WALLET}
            className="btn-primary"
          >
            {busy ? "Signature…" : current.kind === "ok" ? "Créer la nouvelle config (devnet)" : "Créer la config (devnet)"}
          </button>
        )
      )}
      {error && <p className="text-sm break-all text-vente">{error}</p>}
    </section>
  );
}
