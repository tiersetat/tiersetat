"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { DEFI_DURATIONS, DEFI_RULES_TEXT, checkDefi, checkEntryUrl } from "@/lib/defis";

type Defi = { id: number; creator_wallet: string; title: string; rules: string; ends_at: string; status: "pending" | "approved" | "rejected" | "closed"; reject_reason: string | null; winner_entry_id: number | null };
type Entry = { id: number; defi_id: number; author_wallet: string; url: string; note: string | null; profiles: { pseudo: string | null } | null };

const left = (iso: string, now: number) => {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return "terminé";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `encore ${d} j ${h} h` : `encore ${h} h`;
};
const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

/** Les Défis d'une communauté : le créateur lance un défi (validé avant publication), la communauté participe avec un lien. */
export function DefisPanel({ mint, ticker, creator }: { mint: string; ticker: string; creator: string }) {
  const { profile, signIn } = useSession();
  const [defis, setDefis] = useState<Defi[] | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rules, setRules] = useState("");
  const [days, setDays] = useState<number>(7);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [entryFor, setEntryFor] = useState<number | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    try {
      const j = (await (await fetch(`/api/defis?mint=${mint}`)).json()) as { defis: Defi[]; entries: Entry[] };
      setNow(Date.now());
      setDefis(j.defis ?? []);
      setEntries(j.entries ?? []);
    } catch {
      setNow(Date.now());
      setDefis([]);
    }
  }, [mint]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load, profile?.wallet]);

  const post = async (body: object) => {
    const res = await fetch("/api/defis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(j.error ?? "Action impossible");
  };

  const create = async () => {
    const c = checkDefi(title, rules);
    if (!c.ok) return setMsg({ ok: false, text: c.reason });
    try {
      await post({ action: "creer", mint, title, rules, days });
      setMsg({ ok: true, text: "Défi envoyé ! Il sera visible dès qu'il aura été vérifié (en général sous 24 h)." });
      setTitle("");
      setRules("");
      setOpen(false);
      void load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };
  const participate = async (defiId: number) => {
    const u = checkEntryUrl(url);
    if (!u.ok) return setMsg({ ok: false, text: u.reason });
    try {
      await post({ action: "participer", defiId, url, note: note || undefined });
      setMsg({ ok: true, text: "Participation enregistrée, bonne chance !" });
      setEntryFor(null);
      setUrl("");
      setNote("");
      void load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };
  const pickWinner = async (defiId: number, entryId: number) => {
    try {
      await post({ action: "gagnant", defiId, entryId });
      void load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };

  const isCreator = profile?.wallet === creator;
  if (defis === null) return null;
  if (defis.length === 0 && !isCreator) return null;

  return (
    <section className="surface space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Défis ${ticker}</h2>
          <p className="text-xs text-muted-foreground">Fais vivre le mème : vidéos, photos, mèmes. La récompense : le badge « Gagnant de défi ».</p>
        </div>
        {isCreator && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="btn-fete min-h-9 shrink-0 px-4 py-1.5 text-sm">
            {open ? "Fermer" : "Lancer un défi"}
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-2 rounded-2xl bg-white/[0.04] p-3">
          <input className="field text-sm" maxLength={80} placeholder="Titre (ex. La meilleure vidéo $DETTE)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="field min-h-20 text-sm" maxLength={500} placeholder="Ce qu'il faut faire, et où le publier" value={rules} onChange={(e) => setRules(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Durée :</span>
            {DEFI_DURATIONS.map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)} className={`chip px-3 py-1 text-xs ${days === d ? "chip-active" : ""}`}>
                {d} jours
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">{DEFI_RULES_TEXT}</p>
          <button type="button" onClick={() => void create()} className="btn-primary min-h-0 w-full py-2 text-sm">
            Envoyer le défi pour vérification
          </button>
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-achat" : "text-vente"}`}>{msg.text}</p>}

      <ul className="space-y-3">
        {defis.map((d) => {
          const list = entries.filter((e) => e.defi_id === d.id);
          const winner = list.find((e) => e.id === d.winner_entry_id);
          const running = d.status === "approved" && Date.parse(d.ends_at) > now;
          return (
            <li key={d.id} className="space-y-2 rounded-2xl border border-white/[0.08] p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-extrabold">{d.title}</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {d.status === "pending" ? "En vérification" : d.status === "rejected" ? "Refusé" : d.status === "closed" ? "Terminé" : left(d.ends_at, now)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{d.rules}</p>
              {d.status === "rejected" && d.reject_reason && <p className="text-xs text-vente">Raison : {d.reject_reason}</p>}
              {winner && (
                <p className="rounded-xl bg-achat/10 px-3 py-2 text-sm">
                  <b className="text-achat">Gagnant :</b> {winner.profiles?.pseudo ?? short(winner.author_wallet)} ·{" "}
                  <a href={winner.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    voir la publication
                  </a>
                </p>
              )}
              {list.length > 0 && (
                <ul className="space-y-1">
                  {list.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-sm">
                      <a href={e.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-pervenche">
                        <b>{e.profiles?.pseudo ?? short(e.author_wallet)}</b>
                        {e.note ? ` · ${e.note}` : ""}
                      </a>
                      {isCreator && running && (
                        <button type="button" onClick={() => void pickWinner(d.id, e.id)} className="chip shrink-0 px-2 py-0.5 text-[11px]">
                          Choisir
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {running && !isCreator && (
                entryFor === d.id ? (
                  <div className="space-y-2">
                    <input className="field text-sm" placeholder="Lien de ta publication (X, TikTok, Instagram, YouTube)" value={url} onChange={(e) => setUrl(e.target.value)} />
                    <input className="field text-sm" maxLength={200} placeholder="Un mot (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button type="button" onClick={() => void participate(d.id)} className="btn-primary min-h-0 w-full py-2 text-sm">
                      Participer
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => (profile ? setEntryFor(d.id) : void signIn())} className="btn-ghost min-h-9 w-full py-1.5 text-sm">
                    {profile ? "Participer" : "Se connecter pour participer"}
                  </button>
                )
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
