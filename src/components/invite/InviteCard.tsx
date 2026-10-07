"use client";

import { useEffect, useState } from "react";
import { SITE_URL } from "@/lib/solana/config";

/** Lien d'invitation personnel du compte connecté, à copier ou partager sur X. */
export function InviteCard() {
  const [data, setData] = useState<{ code: string; invited: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/invite", { method: "POST" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Lien indisponible pour l'instant.");
        if (!cancelled) setData(json);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const link = data ? `${SITE_URL}/?invite=${data.code}` : "";
  const text = "Je frappe ma monnaie sur Tiers-État, le launchpad des mèmes français 🇫🇷 Rejoins-moi :";

  return (
    <section className="surface space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold">Invite le peuple</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Partage ton lien. Chaque personne invitée qui crée ou échange un mème te rapporte 50 points.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : !data ? (
        <div className="h-11 animate-pulse rounded-xl bg-white/[0.04]" />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-ligne bg-white/[0.03] px-3 py-2.5 font-mono text-sm">{link}</code>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* presse-papiers indisponible */
                }
              }}
            >
              {copied ? "Copié ✓" : "Copier"}
            </button>
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              Partager sur X
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            Ton code : <span className="font-mono text-foreground">{data.code}</span> ·{" "}
            <strong className="text-foreground">{data.invited}</strong> {data.invited > 1 ? "personnes invitées" : "personne invitée"}
          </p>
        </>
      )}
    </section>
  );
}
