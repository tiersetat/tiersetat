"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PendingDefi = { id: number; mint: string; title: string; rules: string; ends_at: string; created_at: string; tokens: { ticker: string } | null };

/** Défis en attente : on les lit avant publication, puis on valide ou on refuse avec une raison. */
export function DefisAdminPanel({ defis }: { defis: PendingDefi[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [reason, setReason] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const act = async (body: object, id: number) => {
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/defis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Action impossible");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="surface space-y-3 p-5">
      <h2 className="font-semibold">Défis à vérifier ({defis.length})</h2>
      {defis.length === 0 && <p className="text-sm text-muted-foreground">Aucun défi en attente.</p>}
      {err && <p className="text-sm text-vente">{err}</p>}
      <ul className="space-y-3">
        {defis.map((d) => (
          <li key={d.id} className="space-y-2 rounded-xl border border-white/[0.08] p-3 text-sm">
            <p>
              <a href={`/communaute/${d.mint}`} className="font-bold hover:underline">
                ${d.tokens?.ticker ?? "?"}
              </a>{" "}
              · {d.title}
            </p>
            <p className="whitespace-pre-line text-muted-foreground">{d.rules}</p>
            <p className="text-xs text-muted-foreground">Fin : {new Date(d.ends_at).toLocaleString("fr-FR")}</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy === d.id} onClick={() => void act({ action: "valider", id: d.id }, d.id)} className="btn-primary min-h-0 px-3 py-1.5 text-xs">
                Valider
              </button>
              <input className="field min-h-0 flex-1 py-1.5 text-xs" placeholder="Raison du refus" value={reason[d.id] ?? ""} onChange={(e) => setReason({ ...reason, [d.id]: e.target.value })} />
              <button
                type="button"
                disabled={busy === d.id || (reason[d.id] ?? "").trim().length < 3}
                onClick={() => void act({ action: "refuser", id: d.id, reason: reason[d.id] }, d.id)}
                className="btn-ghost min-h-0 px-3 py-1.5 text-xs"
              >
                Refuser
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
