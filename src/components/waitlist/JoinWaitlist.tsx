"use client";

import Link from "next/link";
import { useState } from "react";

const fmt = (n: number) => n.toLocaleString("fr-FR");

/** Formulaire de la liste d'attente : un e-mail, un consentement, un bouton. */
export function JoinWaitlist({ initialCount, source = "accueil" }: { initialCount: number | null; source?: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(initialCount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) return setError("Coche la case pour accepter de recevoir l'e-mail du lancement.");
    setStatus("loading");
    try {
      const res = await fetch("/api/rejoindre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, source, website }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Inscription impossible, réessaie.");
      if (typeof json.count === "number") setCount(json.count);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible, réessaie.");
      setStatus("idle");
    }
  }

  return (
    <div className="w-full max-w-md space-y-3">
      {status === "done" ? (
        <p className="rounded-xl border border-achat/30 bg-achat/10 p-4 text-center text-sm">
          <strong className="text-achat">Tu es dans la liste ✓</strong>
          <br />
          On t&apos;écrit le jour du lancement, avec l&apos;heure exacte.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2 rounded-2xl border border-ligne bg-white/[0.03] p-1.5 focus-within:border-pervenche/60">
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="ton@email.fr"
              aria-label="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <button type="submit" disabled={status === "loading"} className="btn-primary shrink-0 px-5 py-2.5">
              {status === "loading" ? "…" : "Rejoindre"}
            </button>
          </div>
          {/* Piège à robots, invisible pour les humains */}
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" />
          <label className="flex items-start gap-2 text-left text-xs text-muted-foreground">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--pervenche)]" />
            <span>
              J&apos;accepte de recevoir l&apos;e-mail du lancement officiel de Tiers-État. Rien d&apos;autre, désinscription à tout moment.{" "}
              <Link href="/mentions-legales" className="underline underline-offset-2 hover:text-foreground">
                Données personnelles
              </Link>
            </span>
          </label>
          {error && <p className="text-xs text-vente">{error}</p>}
        </form>
      )}
      {count !== null && count > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{fmt(count)}</span> {count > 1 ? "personnes attendent" : "personne attend"} le lancement
        </p>
      )}
    </div>
  );
}
