"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { TokenCard } from "@/components/brand/TokenCard";
import { useSession } from "@/components/providers/SessionProvider";
import { moderate } from "@/lib/moderation";
import { explorerUrl } from "@/lib/solana/config";
import { applyPriority } from "@/lib/solana/priority";
import { hasAcceptedRisk, RiskGate } from "@/components/token/RiskGate";
import { celebrate } from "@/lib/celebrate";
import { IMAGE_MAX_BYTES, IMAGE_TYPES, launchFieldsSchema } from "@/lib/validators";

type Step = "idle" | "upload" | "sign" | "confirm" | "index" | "done";

const STEP_LABEL: Record<Step, string> = {
  idle: "Créer le token",
  upload: "Envoi de l'image sur IPFS…",
  sign: "Signe dans ton wallet…",
  confirm: "Confirmation on-chain…",
  index: "Publication…",
  done: "Token créé !",
};


export function LaunchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { profile, status, signIn } = useSession();

  const [name, setName] = useState(params.get("nom") ?? "");
  const [ticker, setTicker] = useState((params.get("ticker") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
  const [description, setDescription] = useState(params.get("description") ?? "");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const source = params.get("source") ?? "";
  const [firstBuy, setFirstBuy] = useState("0");
  const [image, setImage] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [askRisk, setAskRisk] = useState(false);

  const preview = useMemo(() => (image ? URL.createObjectURL(image) : undefined), [image]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const signedIn = status === "signed" && profile && publicKey && profile.wallet === publicKey.toBase58();
  const busy = step !== "idle" && step !== "done";

  function pickImage(file: File | undefined) {
    setError(null);
    if (!file) return setImage(null);
    if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
      return setError("Format d'image non supporté (PNG, JPG, GIF ou WebP).");
    }
    if (file.size > IMAGE_MAX_BYTES) return setError("Image trop lourde (4 Mo max).");
    setImage(file);
  }

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!publicKey) return setVisible(true);
    if (!signedIn) return void signIn();
    if (!hasAcceptedRisk()) return setAskRisk(true);

    const parsed = launchFieldsSchema.safeParse({ name, ticker, description, twitter, website, source: source || undefined });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
    if (!image) return setError("Ajoute une image à ton mème.");
    // Retour immédiat ; le serveur refait le contrôle avec la liste complète des mots bloqués.
    const local = moderate([parsed.data.name, parsed.data.ticker, parsed.data.description], []);
    if (!local.ok) return setError(local.reason);
    const buySol = Number(firstBuy.replace(",", "."));
    if (!Number.isFinite(buySol) || buySol < 0 || buySol > 4) {
      return setError("Achat initial : entre 0 et 4 SOL.");
    }

    try {
      setStep("upload");
      const form = new FormData();
      form.set("name", parsed.data.name);
      form.set("ticker", parsed.data.ticker);
      form.set("description", parsed.data.description);
      if (parsed.data.twitter) form.set("twitter", parsed.data.twitter);
      if (parsed.data.website) form.set("website", parsed.data.website);
      if (parsed.data.source) form.set("source", parsed.data.source);
      form.set("image", image);
      const up = await fetch("/api/upload", { method: "POST", body: form });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error ?? "Upload impossible");

      setStep("sign");
      const { buildLaunchTx } = await import("@/lib/solana/launch");
      const { tx, mintKeypair } = await buildLaunchTx(connection, {
        creator: publicKey,
        name: upJson.name,
        symbol: upJson.ticker,
        uri: upJson.metadataUri,
        firstBuySol: buySol,
      });
      applyPriority(tx, "rapide");
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = publicKey;
      tx.recentBlockhash = latest.blockhash;
      const sig = await sendTransaction(tx, connection, { signers: [mintKeypair] });
      setSignature(sig);
      void celebrate("launch");

      setStep("confirm");
      const conf = await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
      if (conf.value.err) throw new Error("La transaction a échoué on-chain.");

      setStep("index");
      const mint = mintKeypair.publicKey.toBase58();
      const reg = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: sig, mint, source: parsed.data.source }),
      });
      const regJson = await reg.json();
      if (!reg.ok) throw new Error(regJson.error ?? "Indexation impossible");

      setStep("done");
      router.push(`/token/${mint}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(/reject|refus|declin/i.test(msg) ? "Transaction refusée dans le wallet." : msg);
      setStep("idle");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <form onSubmit={onSubmit} className="surface space-y-5 p-6">
        {source && (
          <p className="rounded-xl border border-pervenche/30 bg-pervenche/10 p-3 text-sm">
            Inspiré de l&apos;actu :{" "}
            <a href={source} target="_blank" rel="noreferrer" className="break-all text-lueur underline-offset-2 hover:underline">
              {source}
            </a>
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-[1fr_170px]">
          <Field label="Nom" hint="32 caractères max">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} placeholder="La Baguette Révolutionnaire" required />
          </Field>
          <Field label="Ticker" hint="2 à 10 caractères">
            <input
              className="field font-mono uppercase"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              maxLength={10}
              placeholder="BAGUETTE"
              required
            />
          </Field>
        </div>

        <Field label="Image" hint="PNG, JPG, GIF ou WebP · 4 Mo max">
          <input
            type="file"
            accept={IMAGE_TYPES.join(",")}
            onChange={(e) => pickImage(e.target.files?.[0])}
            className="field cursor-pointer py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
          />
        </Field>

        <Field label="Description" hint={`${description.length}/500`}>
          <textarea className="field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="L'histoire de ton mème…" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Lien X" hint="optionnel">
            <input className="field" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/…" />
          </Field>
          <Field label="Site" hint="optionnel">
            <input className="field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
          </Field>
        </div>

        <Field label="Premier achat" hint="en SOL · optionnel">
          <input className="field font-mono" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value)} inputMode="decimal" />
        </Field>

        <p className="text-xs text-muted-foreground">
          Interdit : se faire passer pour une personne ou une marque réelle (« officiel », « vérifié »…) et les contenus haineux. Le nom et l&apos;image sont définitifs une fois le token créé.
        </p>

        {error && <p className="rounded-xl border border-vente/40 bg-vente/10 p-3 text-sm text-vente">{error}</p>}
        {signature && step !== "idle" && (
          <a className="block text-xs text-muted-foreground hover:text-foreground" href={explorerUrl("tx", signature)} target="_blank" rel="noreferrer">
            Voir la transaction sur Solscan ↗
          </a>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
          {!publicKey ? "Connecter un wallet" : !signedIn ? "Se connecter" : STEP_LABEL[step]}
        </button>
      </form>

      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <p className="label">Aperçu</p>
        <TokenCard name={name || "Nom du token"} ticker={ticker || "TICKER"} imageUrl={preview} marketCapSol={2} progress={0} />
        <p className="text-xs text-muted-foreground">
          Frais de création : 0,02 SOL (anti-spam), plus ~0,02 SOL de frais réseau. Tu touches 70 % des frais de trading de ton token. Migration automatique sur un DEX à la fin de la courbe.
        </p>
      </aside>

      {askRisk && (
        <RiskGate
          title="Avant de frapper ton premier mème"
          onCancel={() => setAskRisk(false)}
          onAccept={() => {
            setAskRisk(false);
            void onSubmit();
          }}
        />
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
