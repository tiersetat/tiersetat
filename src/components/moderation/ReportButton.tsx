"use client";

import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";

const REASONS = [
  { value: "usurpation", label: "Usurpation (faux « officiel », vraie personne, marque)" },
  { value: "haine", label: "Contenu haineux ou discriminatoire" },
  { value: "arnaque", label: "Arnaque ou tromperie" },
  { value: "illegal", label: "Contenu illégal" },
  { value: "autre", label: "Autre" },
] as const;

/** Signalement d'un token à la modération (une fois par compte). */
export function ReportButton({ mint }: { mint: string }) {
  const { profile, signIn } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("usurpation");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setState("sending");
    setError(null);
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mint, reason, details: details.trim() || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Signalement impossible.");
      setState("idle");
      return;
    }
    setState("done");
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="chip text-vente/90 hover:text-vente">
        Signaler
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-ligne bg-popover p-6">
            <h2 id="report-title" className="text-lg font-semibold">Signaler ce token</h2>
            {state === "done" ? (
              <>
                <p className="text-sm text-muted-foreground">Merci, la modération va examiner ce token.</p>
                <button type="button" className="btn-primary w-full" onClick={() => setOpen(false)}>
                  Fermer
                </button>
              </>
            ) : !profile ? (
              <>
                <p className="text-sm text-muted-foreground">Connecte ton wallet puis clique sur « Se connecter » pour signaler un token.</p>
                <div className="flex gap-3">
                  <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(false)}>
                    Annuler
                  </button>
                  <button type="button" className="btn-primary flex-1" onClick={() => void signIn()}>
                    Se connecter
                  </button>
                </div>
              </>
            ) : (
              <>
                <fieldset className="space-y-2">
                  {REASONS.map((r) => (
                    <label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-ligne px-3 py-2 text-sm has-[:checked]:border-pervenche/60 has-[:checked]:bg-pervenche/10">
                      <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-[var(--pervenche)]" />
                      {r.label}
                    </label>
                  ))}
                </fieldset>
                <textarea className="field min-h-20" maxLength={500} placeholder="Précisions (optionnel)" value={details} onChange={(e) => setDetails(e.target.value)} />
                {error && <p className="text-sm text-vente">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(false)}>
                    Annuler
                  </button>
                  <button type="button" className="btn-primary flex-1" disabled={state === "sending"} onClick={() => void send()}>
                    {state === "sending" ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
