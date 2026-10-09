"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { explorerUrl } from "@/lib/solana/config";
import { PLATFORM_CURVE } from "@/lib/solana/platform";
import type { PoolSnapshot, Side } from "@/lib/solana/swap";
import { Eur } from "@/components/Eur";
import { applyPriority } from "@/lib/solana/priority";
import { hasAcceptedRisk, RiskGate } from "./RiskGate";
import { celebrate } from "@/lib/celebrate";
import { TradeSettings, useTradeSettings } from "./TradeSettings";

const TOKEN_UNIT = 10 ** PLATFORM_CURVE.tokenDecimals;
const FEE_RESERVE_SOL = 0.01; // frais réseau + création du compte de token

const fmt = (n: number, max = 4) => n.toLocaleString("fr-FR", { maximumFractionDigits: max });

type Props = { mint: string; pool: string; ticker: string; migrated: boolean; warnings: string[]; onTraded: () => void };

/** Achat / vente en SOL sur la bonding curve (transaction signée par le wallet). */
export function TradePanel({ mint, pool, ticker, migrated, warnings, onTraded }: Props) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [estimate, setEstimate] = useState<number | null>(null);
  /** Achat final d'une courbe : SOL réellement utilisés (le reste est rendu), sinon null */
  const [partialSol, setPartialSol] = useState<number | null>(null);
  /** Frais réels du devis (en %), pour signaler la minute anti-robots */
  const [feePct, setFeePct] = useState<number | null>(null);
  const [balances, setBalances] = useState<{ sol: number; token: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [askRisk, setAskRisk] = useState(false);
  const [settings, setSettings] = useTradeSettings();
  const snapRef = useRef<{ snap: PoolSnapshot; at: number } | null>(null);

  const loadSnapshot = useCallback(
    async (force = false) => {
      const cached = snapRef.current;
      if (!force && cached && Date.now() - cached.at < 10_000) return cached.snap;
      const { loadPoolSnapshot } = await import("@/lib/solana/swap");
      const snap = await loadPoolSnapshot(connection, pool);
      snapRef.current = { snap, at: Date.now() };
      return snap;
    },
    [connection, pool],
  );

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return setBalances(null);
    const ata = getAssociatedTokenAddressSync(new PublicKey(mint), publicKey);
    const [lamports, token] = await Promise.all([
      connection.getBalance(publicKey),
      connection.getTokenAccountBalance(ata).then((r) => Number(r.value.amount) / TOKEN_UNIT).catch(() => 0),
    ]);
    setBalances({ sol: lamports / 1e9, token });
  }, [connection, publicKey, mint]);

  useEffect(() => {
    // Lecture asynchrone des soldes (le setState a lieu après la requête réseau)
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void refreshBalances();
    });
    return () => {
      cancelled = true;
    };
  }, [refreshBalances]);

  const parsed = Number(amount.replace(",", "."));
  const amountIn =
    Number.isFinite(parsed) && parsed > 0
      ? new BN(Math.floor(parsed * (side === "buy" ? 1e9 : TOKEN_UNIT)).toString())
      : null;

  // Devis en direct (debounce 300 ms)
  useEffect(() => {
    if (!amountIn || migrated) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const [{ quote }, snap] = await Promise.all([import("@/lib/solana/swap"), loadSnapshot()]);
        const q = quote(connection, snap, side, amountIn, settings.slippageBps);
        if (!cancelled) {
          setEstimate(Number(q.outputAmount.toString()) / (side === "buy" ? TOKEN_UNIT : 1e9));
          setPartialSol(side === "buy" && !q.amountLeft.isZero() ? Number(q.amountUsed.toString()) / 1e9 : null);
          setFeePct(q.feePct);
        }
      } catch {
        if (!cancelled) {
          setEstimate(null);
          setPartialSol(null);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // amountIn est dérivé de amount/side : on suit les sources
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, side, migrated, connection, loadSnapshot, settings.slippageBps]);

  async function execute() {
    if (!publicKey || !amountIn) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { buildSwapTx, quote } = await import("@/lib/solana/swap");
      const snap = await loadSnapshot(true);
      const q = quote(connection, snap, side, amountIn, settings.slippageBps);
      const tx = applyPriority(
        await buildSwapTx(connection, { owner: publicKey, pool, side, amountIn, minimumAmountOut: q.minimumAmountOut }),
        settings.priority,
      );
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = publicKey;
      tx.recentBlockhash = latest.blockhash;
      const signature = await sendTransaction(tx, connection);
      const conf = await connection.confirmTransaction({ signature, ...latest }, "confirmed");
      if (conf.value.err) throw new Error("La transaction a échoué on-chain.");
      setDone(signature);
      void celebrate(side);
      setAmount("");
      setEstimate(null);
      await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, mint }),
      }).catch(() => undefined);
      await refreshBalances();
      onTraded();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /reject|refus|declin/i.test(msg)
          ? "Transaction refusée dans le wallet."
          : /slippage|ExceededSlippage|0x1771/i.test(msg)
            ? `Le prix a bougé pendant la signature (glissement > ${settings.slippageBps / 100} %). Réessaie ou augmente le glissement (⚙).`
            : /insufficient|0x1\b/i.test(msg)
              ? "Solde insuffisant (pense aux ~0,01 SOL de frais réseau)."
              : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  function onSubmit() {
    setError(null);
    if (!publicKey) return setVisible(true);
    if (!amountIn) return setError("Indique un montant.");
    if (balances) {
      if (side === "buy" && parsed + FEE_RESERVE_SOL > balances.sol) return setError("Solde SOL insuffisant (garde ~0,01 SOL pour les frais).");
      if (side === "sell" && parsed > balances.token) return setError(`Tu n'as que ${fmt(balances.token, 0)} $${ticker}.`);
    }
    if (side === "buy" && !hasAcceptedRisk()) return setAskRisk(true);
    void execute();
  }

  if (migrated) {
    return (
      <div className="surface p-5 text-sm">
        <p className="font-semibold text-achat">Token sur le DEX</p>
        <p className="mt-1 text-muted-foreground">La courbe est remplie : ce token s&apos;échange désormais sur Meteora (DAMM v2).</p>
      </div>
    );
  }

  const quick = side === "buy" ? ["0.1", "0.5", "1"] : ["25", "50", "100"];

  return (
    <div className="surface space-y-4 p-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSide(s);
              setAmount("");
              setEstimate(null);
              setError(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              side === s ? (s === "buy" ? "bg-achat text-nuit" : "bg-vente text-nuit") : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "buy" ? "Acheter" : "Vendre"}
          </button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="flex justify-between">
          <span className="label">{side === "buy" ? "Montant en SOL" : `Montant en $${ticker}`}</span>
          {balances && (
            <span className="text-xs text-muted-foreground">
              Solde : <span className="font-mono">{side === "buy" ? `${fmt(balances.sol)} SOL` : `${fmt(balances.token, 0)}`}</span>
            </span>
          )}
        </span>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,0" className="field font-mono text-lg" />
      </label>

      <div className="flex gap-2">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              if (side === "buy") setAmount(q);
              else if (balances) setAmount(String(Math.floor((balances.token * Number(q)) / 100)));
            }}
            className="chip flex-1 text-center"
          >
            {side === "buy" ? `${q} SOL` : `${q} %`}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <TradeSettings value={settings} onChange={setSettings} />
      </div>

      <div className="min-h-10 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
        {amountIn && estimate !== null ? (
          <>
            Tu reçois ≈{" "}
            <span className="font-mono text-sm font-medium text-foreground">
              {side === "buy" ? `${fmt(estimate, 0)} $${ticker}` : `${fmt(estimate, 4)} SOL`}
            </span>{" "}
            <Eur sol={side === "buy" ? parsed : estimate} className="text-xs text-muted-foreground" />
            <br />
            Glissement max {settings.slippageBps / 100} % · frais {feePct !== null ? `${feePct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : "1 %"}
            {feePct !== null && feePct > 1.5 && (
              <span className="mt-1.5 block text-vente">
                Protection anti-robots : ce mème vient d&apos;être lancé, les frais démarrent très haut et redescendent à 1 % en une minute.
                Attends quelques secondes pour payer moins.
              </span>
            )}
            {partialSol !== null && (
              <span className="mt-1.5 block text-amber-300">
                Ton achat complète la courbe : seuls ≈ {fmt(partialSol, 4)} SOL seront utilisés, le reste reste dans ton wallet. Le mème prend
                ensuite la Bastille 🏰
              </span>
            )}
          </>
        ) : (
          "Saisis un montant pour voir l'estimation."
        )}
      </div>

      {side === "buy" && balances && balances.sol < 0.02 && (
        <p className="rounded-xl border border-pervenche/30 bg-pervenche/10 px-3 py-2 text-xs">
          Solde SOL insuffisant.{" "}
          <a href="/demarrer" className="font-medium text-lueur underline-offset-2 hover:underline">
            Obtenir des SOL →
          </a>
        </p>
      )}

      {side === "buy" && warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300/30 bg-amber-300/[0.07] px-3 py-2 text-xs text-amber-100">
          <p className="font-medium">Avant d&apos;acheter :</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className={`w-full rounded-xl py-3 text-sm font-semibold text-nuit transition disabled:opacity-60 ${side === "buy" ? "bg-achat hover:brightness-110" : "bg-vente hover:brightness-110"}`}
      >
        {!publicKey ? "Connecter un wallet" : busy ? "Signature…" : side === "buy" ? `Acheter $${ticker}` : `Vendre $${ticker}`}
      </button>

      {error && <p className="rounded-xl border border-vente/40 bg-vente/10 p-3 text-sm break-words text-vente">{error}</p>}
      {done && (
        <a href={explorerUrl("tx", done)} target="_blank" rel="noreferrer" className="block text-xs text-achat hover:underline">
          ✓ Transaction confirmée · voir sur Solscan ↗
        </a>
      )}

      {askRisk && (
        <RiskGate
          onCancel={() => setAskRisk(false)}
          onAccept={() => {
            setAskRisk(false);
            void execute();
          }}
        />
      )}
    </div>
  );
}
