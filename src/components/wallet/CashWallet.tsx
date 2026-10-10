"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CLUSTER, explorerUrl } from "@/lib/solana/config";
import { buildSendTransaction, cashTotal, CASH, getBalances, parseRecipient, SOL_FEE_RESERVE, type AssetSymbol, type Balances } from "@/lib/solana/cash";
import { SlideToConfirm } from "@/components/token/SlideToConfirm";
import { PRIVY_APP_ID } from "@/components/providers/PrivyBridge";
import { PrivySecurity } from "./PrivySecurity";

type Display = "EUR" | "USD";
type Sheet = null | "recevoir" | "envoyer" | "securite";
const DEVNET = (CLUSTER as string) === "devnet";

const money = (n: number, cur: Display) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n: number, d = 4) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });

function readDisplay(): Display {
  try {
    return localStorage.getItem("cash-display") === "USD" ? "USD" : "EUR";
  } catch {
    return "EUR";
  }
}

/** Portefeuille Tiers-État : solde « Cash » (USDC / EURC), SOL, recevoir, envoyer, sécurité. */
export function CashWallet() {
  const { connection } = useConnection();
  const { publicKey, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [balances, setBalances] = useState<Balances | null>(null);
  const [usdEur, setUsdEur] = useState<number | null>(null);
  const [display, setDisplay] = useState<Display>("EUR");
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    Promise.resolve().then(() => setDisplay(readDisplay()));
    fetch("/api/prix")
      .then((r) => r.json())
      .then((j: { usdEur: number | null }) => setUsdEur(j.usdEur))
      .catch(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    try {
      setBalances(await getBalances(connection, publicKey));
    } catch {
      /* RPC momentanément indisponible : on garde l'affichage précédent */
    }
  }, [connection, publicKey]);

  useEffect(() => {
    Promise.resolve().then(refresh);
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  const choose = (d: Display) => {
    setDisplay(d);
    try {
      localStorage.setItem("cash-display", d);
    } catch {
      /* stockage indisponible */
    }
  };

  if (!publicKey) {
    return (
      <section className="surface space-y-4 p-6 text-center">
        <h2 className="text-2xl font-extrabold">Ton portefeuille Tiers-État</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Connecte-toi avec ton e-mail : un portefeuille sécurisé est créé pour toi en quelques secondes. Ton argent reste à toi, Tiers-État n&apos;y a jamais accès.
        </p>
        <button type="button" onClick={() => setVisible(true)} className="btn-fete">
          Me connecter
        </button>
      </section>
    );
  }

  const total = balances ? cashTotal(balances, display, usdEur) : null;
  const isPrivy = Boolean(PRIVY_APP_ID) && wallet?.adapter.name === "Privy";

  return (
    <section className="space-y-4">
      {/* Carte Cash */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-electrique via-[#4a49f0] to-[#7b3fe0] p-6 text-white shadow-[0_24px_60px_-24px_rgb(61_90_254/0.9)] sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(255_210_63/0.45),transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/80">Cash{DEVNET ? " · bêta, argent fictif" : ""}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight sm:text-6xl">
              {balances === null ? "…" : total === null ? "—" : money(total, display)}
            </p>
          </div>
          <div className="flex rounded-full bg-black/20 p-1 text-sm font-bold" role="group" aria-label="Monnaie d'affichage">
            {(["EUR", "USD"] as Display[]).map((d) => (
              <button key={d} type="button" onClick={() => choose(d)} aria-pressed={display === d} className={`rounded-full px-3 py-1 ${display === d ? "bg-white text-nuit" : "text-white/80"}`}>
                {d === "EUR" ? "€" : "$"}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-2">
          {(
            [
              ["recevoir", "Recevoir"],
              ["envoyer", "Envoyer"],
              ["securite", "Sécurité"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSheet(sheet === k ? null : k)}
              aria-expanded={sheet === k}
              className={`rounded-2xl px-2 py-3 text-sm font-extrabold transition active:scale-95 ${sheet === k ? "bg-soleil text-nuit" : "bg-white/15 hover:bg-white/25"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sheet === "recevoir" && <Receive address={publicKey.toBase58()} />}
      {sheet === "envoyer" && balances && <Send balances={balances} onSent={refresh} />}
      {sheet === "securite" && (
        <div className="surface space-y-3 p-5">
          <h3 className="text-lg font-extrabold">Sécurité</h3>
          {isPrivy ? (
            <PrivySecurity address={publicKey.toBase58()} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Tu utilises un wallet externe ({wallet?.adapter.name}) : sa sécurité (phrase secrète, mot de passe, Ledger) se gère dans ton wallet. Tiers-État n&apos;a jamais accès à tes fonds.
            </p>
          )}
        </div>
      )}

      {/* Détail des soldes */}
      <ul className="surface divide-y divide-ligne">
        {(
          [
            { s: "USDC", name: "Dollar", sub: "Cash en dollars (USDC)", dot: "bg-ciel" },
            { s: "EURC", name: "Euro", sub: "Cash en euros (EURC)", dot: "bg-soleil" },
            { s: "SOL", name: "Solana", sub: "Pour acheter des mèmes et payer les frais du réseau", dot: "bg-bonbon" },
          ] as { s: AssetSymbol; name: string; sub: string; dot: string }[]
        ).map((a) => (
          <li key={a.s} className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-nuit ${a.dot}`}>{a.s === "SOL" ? "◎" : a.s === "USDC" ? "$" : "€"}</span>
              <div className="min-w-0">
                <p className="font-bold">{a.name}</p>
                <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
              </div>
            </div>
            <p className="shrink-0 font-mono font-bold">{balances ? `${qty(balances[a.s], a.s === "SOL" ? 4 : 2)} ${a.s}` : "…"}</p>
          </li>
        ))}
      </ul>

      {/* À venir */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="surface p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-soleil">Au lancement</p>
          <p className="mt-1 font-bold">Acheter un mème avec ton cash</p>
          <p className="mt-1 text-sm text-muted-foreground">Un seul geste : l&apos;appli convertit ton cash en SOL puis en mème, et ta vente revient en cash.</p>
        </div>
        <div className="surface p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-bonbon">Bientôt</p>
          <p className="mt-1 font-bold">Basculer vers Perps</p>
          <p className="mt-1 text-sm text-muted-foreground">Déplace une partie de ton cash vers ton compte de trading perps, et reviens au cash quand tu veux.</p>
        </div>
      </div>
    </section>
  );
}

function Receive({ address }: { address: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(address, { margin: 1, width: 480, color: { dark: "#0b0d2a", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [address]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* copie refusée : l'adresse reste sélectionnable */
    }
  };
  return (
    <div className="surface flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
      {/* eslint-disable-next-line @next/next/no-img-element -- QR code généré localement */}
      {qr && <img src={qr} alt="QR code de ton adresse" className="size-44 shrink-0 rounded-2xl bg-white p-2" />}
      <div className="min-w-0 space-y-2">
        <h3 className="text-lg font-extrabold">Recevoir</h3>
        <p className="text-sm text-muted-foreground">
          Envoie sur cette adresse des SOL, des USDC ou des EURC, <strong className="text-foreground">uniquement sur le réseau Solana</strong>
          {DEVNET ? " (réseau de test pendant la bêta)" : ""}.
        </p>
        <p className="select-all break-all rounded-xl bg-white/[0.06] p-3 font-mono text-xs">{address}</p>
        <button type="button" onClick={copy} className="btn-ghost min-h-10 px-4 py-2 text-sm">
          {copied ? "Adresse copiée" : "Copier l'adresse"}
        </button>
      </div>
    </div>
  );
}

function Send({ balances, onSent }: { balances: Balances; onSent: () => void }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [asset, setAsset] = useState<AssetSymbol>("USDC");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);

  const max = asset === "SOL" ? Math.max(0, balances.SOL - SOL_FEE_RESERVE) : balances[asset];
  const value = Number(amount.replace(",", "."));
  const recipient = parseRecipient(to);
  const problem = !to
    ? "Colle l'adresse du destinataire."
    : !recipient
      ? "Cette adresse Solana n'est pas valide."
      : recipient.equals(publicKey!)
        ? "C'est ta propre adresse."
        : !(value > 0)
          ? "Indique un montant."
          : value > max
            ? `Solde insuffisant (maximum ${qty(max, 6)} ${asset}).`
            : asset !== "SOL" && balances.SOL < 0.003
              ? "Il faut un peu de SOL (0,003) pour payer les frais du réseau."
              : null;

  const send = async () => {
    if (problem || !publicKey || !recipient) return;
    setBusy(true);
    setResult(null);
    try {
      const tx = buildSendTransaction(publicKey, recipient, asset, value);
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setResult({ ok: true, text: `${qty(value, 6)} ${asset} envoyés.`, sig });
      setAmount("");
      onSent();
    } catch {
      setResult({ ok: false, text: "L'envoi n'a pas abouti. Aucun fonds n'a quitté ton portefeuille si la signature a été refusée." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface space-y-4 p-5">
      <h3 className="text-lg font-extrabold">Envoyer</h3>
      <div className="flex gap-2" role="group" aria-label="Monnaie à envoyer">
        {(["USDC", "EURC", "SOL"] as AssetSymbol[]).map((s) => (
          <button key={s} type="button" onClick={() => setAsset(s)} className={`chip ${asset === s ? "chip-active" : ""}`}>
            {s === "SOL" ? "SOL" : `${CASH[s].label} (${s})`}
          </button>
        ))}
      </div>
      <label className="block space-y-1.5">
        <span className="label">Adresse du destinataire (réseau Solana)</span>
        <input id="send-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Ex. 7xKX…" className="field font-mono text-sm" autoComplete="off" spellCheck={false} />
      </label>
      <label className="block space-y-1.5">
        <span className="label flex justify-between">
          <span>Montant</span>
          <button type="button" onClick={() => setAmount(String(Math.floor(max * 1e6) / 1e6))} className="font-bold text-soleil">
            Max : {qty(max, 6)} {asset}
          </button>
        </span>
        <input id="send-amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="field font-mono" />
      </label>
      {to || amount ? <p className={`text-sm ${problem ? "text-muted-foreground" : "text-achat"}`}>{problem ?? "Vérifie bien l'adresse : un envoi sur la blockchain ne peut pas être annulé."}</p> : null}
      <SlideToConfirm label={`Glisser pour envoyer ${asset}`} tone="buy" disabled={Boolean(problem)} busy={busy} onConfirm={send} />
      {result && (
        <p className={`text-sm ${result.ok ? "text-achat" : "text-vente"}`}>
          {result.text}{" "}
          {result.sig && (
            <a href={explorerUrl("tx", result.sig)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Voir la transaction
            </a>
          )}
        </p>
      )}
    </div>
  );
}
