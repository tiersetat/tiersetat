"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { CLUSTER, explorerUrl } from "@/lib/solana/config";
import { buildSendTransaction, cashTotal, CASH, getBalances, parseRecipient, SOL_FEE_RESERVE, type AssetSymbol, type Balances } from "@/lib/solana/cash";
import { SlideToConfirm } from "@/components/token/SlideToConfirm";
import { LoginCta, PRIVY_APP_ID } from "@/components/providers/PrivyBridge";
import { PrivySecurity } from "./PrivySecurity";
import { DepositOptions, SellOptions } from "./FundingOptions";
import { DEMO_CASH_EUR, useDemo } from "@/lib/demo";
import { PortfolioChart } from "./PortfolioChart";
import { addSnapshot, demoHistory, type Point } from "@/lib/portfolio-history";
import { knownRecipients, rememberRecipient, sendRisk } from "@/lib/send-safety";

type Display = "EUR" | "USD";
type Sheet = null | "deposer" | "recevoir" | "envoyer" | "vendre" | "securite";
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
  const demo = useDemo();
  const [history, setHistory] = useState<{ now: number; points: Point[] } | null>(null);

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

  // Courbe du portefeuille : relevés réels du solde sur cet appareil (démo : progression de démonstration)
  useEffect(() => {
    const now = Date.now();
    if (demo) {
      Promise.resolve().then(() => setHistory({ now, points: demoHistory(now) }));
      return;
    }
    if (!publicKey || !balances) return;
    const usd = cashTotal(balances, "USD", usdEur);
    if (usd === null) return;
    const key = `te_value_history_${publicKey.toBase58()}`;
    let pts: Point[] = [];
    try {
      pts = JSON.parse(localStorage.getItem(key) ?? "[]") as Point[];
    } catch {
      pts = [];
    }
    pts = addSnapshot(pts, usd, now);
    try {
      localStorage.setItem(key, JSON.stringify(pts));
    } catch {
      /* stockage indisponible */
    }
    Promise.resolve().then(() => setHistory({ now, points: pts }));
  }, [demo, publicKey, balances, usdEur]);

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
          Connecte-toi avec Google ou ton e-mail : un portefeuille sécurisé est créé pour toi en quelques secondes, sans phrase secrète ni appli à installer. Ton argent reste à toi, Tiers-État n&apos;y a jamais accès.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <LoginCta fallback={() => setVisible(true)}>Continuer avec Google ou e-mail</LoginCta>
          <button type="button" onClick={() => setVisible(true)} className="btn-ghost">
            J&apos;ai déjà un wallet
          </button>
        </div>
      </section>
    );
  }

  // Mode démo (vidéos) : solde de démonstration en euros
  const shown: Balances | null = demo ? { SOL: balances?.SOL ?? 0, USDC: 0, EURC: DEMO_CASH_EUR } : balances;
  const total = shown ? cashTotal(shown, display, usdEur) : null;
  const isPrivy = Boolean(PRIVY_APP_ID) && wallet?.adapter.name === "Privy";

  return (
    <section className="space-y-4">
      {/* Carte Cash */}
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-electrique/35 via-[#4a49f0]/25 to-[#7b3fe0]/30 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] p-6 text-white shadow-[0_24px_60px_-24px_rgb(61_90_254/0.9)] sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(217_204_255/0.35),transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white/80">
              Cash{demo && <span className="ml-2 rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-bold text-white/75">Démo · solde fictif</span>}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tight sm:text-6xl">
              {shown === null ? "…" : total === null ? "—" : money(total, display)}
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
        {history && history.points.length > 1 ? (
          <div className="relative mt-4">
            <PortfolioChart points={history.points} now={history.now} />
          </div>
        ) : (
          <p className="relative mt-3 text-xs text-white/60">La courbe de ton portefeuille apparaîtra au fil de tes visites.</p>
        )}
        <div className="relative mt-6 grid grid-cols-4 gap-2">
          {(
            [
              ["deposer", "Déposer"],
              ["envoyer", "Envoyer"],
              ["vendre", "Vendre"],
              ["securite", "Sécurité"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSheet(sheet === k ? null : k)}
              aria-expanded={sheet === k}
              className={`rounded-2xl px-2 py-3 text-sm font-extrabold transition active:scale-95 ${sheet === k ? "bg-white text-nuit" : "bg-white/12 hover:bg-white/20"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sheet === "deposer" && <DepositOptions address={publicKey.toBase58()} onReceive={() => setSheet("recevoir")} />}
      {sheet === "recevoir" && <Receive address={publicKey.toBase58()} />}
      {sheet === "vendre" && <SellOptions onSend={() => setSheet("envoyer")} />}
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
            <p className="shrink-0 font-mono font-bold">{shown ? `${qty(shown[a.s], a.s === "SOL" ? 4 : 2)} ${a.s}` : "…"}</p>
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
  const demo = useDemo();
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
          Envoie sur cette adresse des SOL, des USDC ou des EURC, <strong className="text-foreground">uniquement sur le réseau Solana</strong>.
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
  const [mode, setMode] = useState<"adresse" | "email">("adresse");
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<{ state: "idle" | "busy" | "ok" | "error"; text?: string; created?: boolean }>({ state: "idle" });
  const [amount, setAmount] = useState("");
  const [ackNew, setAckNew] = useState(false);
  const [ackBig, setAckBig] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);

  const max = asset === "SOL" ? Math.max(0, balances.SOL - SOL_FEE_RESERVE) : balances[asset];
  const value = Number(amount.replace(",", "."));
  const recipient = parseRecipient(to);
  // Envoi par e-mail : on retrouve (ou prépare) le wallet du destinataire, puis l'envoi part directement vers lui
  const findByEmail = async () => {
    setLookup({ state: "busy" });
    setTo("");
    try {
      const res = await fetch("/api/envoi/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = (await res.json()) as { address?: string; created?: boolean; error?: string };
      if (!res.ok || !j.address) throw new Error(j.error ?? "Destinataire introuvable.");
      setTo(j.address);
      setLookup({ state: "ok", created: j.created });
    } catch (err) {
      setLookup({ state: "error", text: err instanceof Error ? err.message : String(err) });
    }
  };

  const risk = sendRisk({
    recipient: to,
    amount: value,
    balance: max,
    // USDC et EURC valent environ un dollar ou un euro : assez précis pour le seuil d'alerte
    amountUsd: asset === "SOL" ? null : value,
    known: typeof window === "undefined" ? [] : knownRecipients(),
  });
  const needAck = (risk.newRecipient && !ackNew) || (risk.big && !ackBig);
  const problem = !to
    ? mode === "email"
      ? "Indique l'e-mail du destinataire, puis touche « Trouver »."
      : "Colle l'adresse du destinataire."
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
      rememberRecipient(to);
      setAckNew(false);
      setAckBig(false);
      setResult({
        ok: true,
        text:
          mode === "email"
            ? `${qty(value, 6)} ${asset} envoyés à ${email}. Préviens cette personne : elle les retrouve en se connectant sur tiersetat.vercel.app avec cet e-mail.`
            : `${qty(value, 6)} ${asset} envoyés.`,
        sig,
      });
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
      <div className="flex rounded-full bg-black/20 p-1 text-sm font-bold" role="group" aria-label="Envoyer à">
        {(
          [
            ["adresse", "Adresse Solana"],
            ["email", "E-mail"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setMode(k);
              setTo("");
              setLookup({ state: "idle" });
            }}
            aria-pressed={mode === k}
            className={`flex-1 rounded-full px-3 py-1.5 ${mode === k ? "bg-white text-nuit" : "text-white/80"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "adresse" ? (
        <label className="block space-y-1.5">
          <span className="label">Adresse du destinataire (réseau Solana)</span>
          <input id="send-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Ex. 7xKX…" className="field font-mono text-sm" autoComplete="off" spellCheck={false} />
        </label>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="send-email" className="label block">
            E-mail du destinataire
          </label>
          <div className="flex gap-2">
            <input
              id="send-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setTo("");
                setLookup({ state: "idle" });
              }}
              placeholder="prenom@exemple.fr"
              className="field text-sm"
              autoComplete="off"
            />
            <button type="button" onClick={() => void findByEmail()} disabled={!email.includes("@") || lookup.state === "busy"} className="btn-ghost min-h-0 shrink-0 px-4 py-2 text-sm">
              {lookup.state === "busy" ? "…" : "Trouver"}
            </button>
          </div>
          {lookup.state === "ok" && (
            <p className="text-xs text-muted-foreground">
              {lookup.created
                ? "Cette personne n'a pas encore de compte : un portefeuille lui est réservé. Elle récupère l'argent en se connectant avec cet e-mail."
                : "Portefeuille Tiers-État trouvé."}{" "}
              <span className="font-mono">
                {to.slice(0, 4)}…{to.slice(-4)}
              </span>
            </p>
          )}
          {lookup.state === "error" && <p className="text-xs text-vente">{lookup.text}</p>}
        </div>
      )}
      <label className="block space-y-1.5">
        <span className="label flex justify-between">
          <span>Montant</span>
          <button type="button" onClick={() => setAmount(String(Math.floor(max * 1e6) / 1e6))} className="font-bold text-soleil">
            Max : {qty(max, 6)} {asset}
          </button>
        </span>
        <input id="send-amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="field font-mono" />
      </label>
      {to || amount ? <p className={`text-sm ${problem ? "text-muted-foreground" : "text-achat"}`}>{problem ?? (mode === "email" ? "Vérifie bien l'e-mail : un envoi sur la blockchain ne peut pas être annulé." : "Vérifie bien l'adresse : un envoi sur la blockchain ne peut pas être annulé.")}</p> : null}
      {!problem && (risk.newRecipient || risk.big) && (
        <div className="space-y-2 rounded-2xl border border-soleil/30 bg-soleil/[0.07] p-3 text-sm">
          {risk.newRecipient && (
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={ackNew} onChange={(e) => setAckNew(e.target.checked)} className="mt-1" />
              <span>Première fois vers ce destinataire : je le connais personnellement et j&apos;ai vérifié l&apos;adresse.</span>
            </label>
          )}
          {risk.big && (
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={ackBig} onChange={(e) => setAckBig(e.target.checked)} className="mt-1" />
              <span>
                Gros montant ({qty(value, 6)} {asset}) : je confirme, et je sais qu&apos;un envoi ne peut pas être annulé.
              </span>
            </label>
          )}
        </div>
      )}
      <SlideToConfirm label={`Glisser pour envoyer ${asset}`} tone="buy" disabled={Boolean(problem) || needAck} busy={busy} onConfirm={send} />
      <p className="text-xs text-muted-foreground">
        Tiers-État ne te demandera jamais de payer pour « débloquer » ou « récupérer » de l&apos;argent. Si quelqu&apos;un te le demande, c&apos;est une arnaque.
      </p>
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
