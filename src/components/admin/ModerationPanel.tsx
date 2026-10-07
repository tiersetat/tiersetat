"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type ReportGroup = {
  mint: string;
  name: string;
  ticker: string;
  hidden: boolean;
  reasons: Record<string, number>;
  details: string[];
  lastAt: string;
};
export type HiddenToken = { mint: string; name: string; ticker: string; hidden_reason: string | null; hidden_at: string | null };

const REASON_LABEL: Record<string, string> = {
  usurpation: "Usurpation",
  haine: "Haine",
  arnaque: "Arnaque",
  illegal: "Illégal",
  autre: "Autre",
};

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return json;
}

/** Modération : signalements, tokens masqués, mots bloqués. */
export function ModerationPanel({ reports, hidden, words }: { reports: ReportGroup[]; hidden: HiddenToken[]; words: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newWord, setNewWord] = useState("");

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl border border-vente/40 bg-vente/10 p-3 text-sm text-vente">{error}</p>}

      <section className="surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Signalements à traiter</h2>
          <span className="chip pointer-events-none">{reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun signalement en attente.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ligne">
            {reports.map((r) => (
              <li key={r.mint} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0 space-y-1">
                  <a href={`/token/${r.mint}`} target="_blank" rel="noreferrer" className="font-medium hover:text-pervenche">
                    {r.name} <span className="font-mono text-sm text-pervenche">${r.ticker}</span>
                  </a>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(r.reasons).map(([reason, n]) => (
                      <span key={reason} className="rounded-full bg-vente/15 px-2 py-0.5 text-xs text-vente">
                        {REASON_LABEL[reason] ?? reason} × {n}
                      </span>
                    ))}
                    {r.hidden && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">déjà masqué</span>}
                  </div>
                  {r.details.slice(0, 3).map((d, i) => (
                    <p key={i} className="max-w-xl text-xs text-muted-foreground">« {d} »</p>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={pending} className="btn-ghost px-3 py-1.5 text-xs" onClick={() => run(() => call("/api/admin/moderation", "POST", { action: "reject", mint: r.mint }))}>
                    Rejeter
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-xl bg-vente px-3 py-1.5 text-xs font-semibold text-nuit disabled:opacity-50"
                    onClick={() => {
                      const top = Object.entries(r.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "autre";
                      run(() => call("/api/admin/moderation", "POST", { action: "hide", mint: r.mint, reason: `Masqué par la modération (${REASON_LABEL[top] ?? top})` }));
                    }}
                  >
                    Masquer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Tokens masqués</h2>
          <span className="chip pointer-events-none">{hidden.length}</span>
        </div>
        {hidden.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun token masqué.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ligne">
            {hidden.map((t) => (
              <li key={t.mint} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {t.name} <span className="font-mono text-sm text-pervenche">${t.ticker}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t.hidden_reason ?? "Sans motif"}</p>
                </div>
                <button type="button" disabled={pending} className="btn-ghost px-3 py-1.5 text-xs" onClick={() => run(() => call("/api/admin/moderation", "POST", { action: "unhide", mint: t.mint }))}>
                  Réafficher
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Mots bloqués</h2>
          <span className="chip pointer-events-none">{words.length}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Refusés dans les noms, tickers et descriptions (accents, majuscules et leet-speak ignorés). Les expressions de plusieurs mots sont acceptées.
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const word = newWord.trim();
            if (!word) return;
            run(async () => {
              await call("/api/admin/blocked-words", "POST", { word });
              setNewWord("");
            });
          }}
        >
          <input className="field" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Ajouter un mot ou une expression" maxLength={60} />
          <button type="submit" disabled={pending} className="btn-primary shrink-0">
            Ajouter
          </button>
        </form>
        <ul className="mt-4 flex flex-wrap gap-2">
          {words.map((w) => (
            <li key={w} className="flex items-center gap-1 rounded-full border border-ligne py-1 pr-1 pl-3 text-xs">
              <span className="font-mono">{w}</span>
              <button
                type="button"
                aria-label={`Retirer ${w}`}
                disabled={pending}
                className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-vente"
                onClick={() => run(() => call("/api/admin/blocked-words", "DELETE", { word: w }))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
