"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/social/Avatar";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { displayName } from "@/lib/display";

type Comment = {
  id: number;
  body: string;
  created_at: string;
  author_wallet: string;
  profiles: { pseudo: string | null; avatar_url: string | null } | null;
};

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
function ago(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (Math.abs(s) < 60) return rtf.format(Math.round(s), "second");
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

const POLL_MS = 15_000;

/** Fil de discussion d'un token (actualisé toutes les 15 s). */
export function Comments({ mint }: { mint: string }) {
  const { profile, signIn } = useSession();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = supabaseBrowser();
    if (!supabase) return setComments([]);
    const { data } = await supabase
      .from("comments")
      .select("id, body, created_at, author_wallet, profiles!comments_author_wallet_fkey(pseudo, avatar_url)")
      .eq("mint", mint)
      .order("created_at", { ascending: false })
      .limit(100);
    setComments((data ?? []) as unknown as Comment[]);
  }, [mint]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (!cancelled && document.visibilityState === "visible") void load();
    };
    void Promise.resolve().then(tick);
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load]);

  async function post(e: FormEvent) {
    e.preventDefault();
    if (!profile) return void signIn();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mint, body }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Envoi impossible");
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function hide(id: number) {
    const res = await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setComments((list) => (list ?? []).filter((c) => c.id !== id));
  }

  return (
    <section className="surface overflow-hidden">
      <h2 className="border-b border-ligne px-5 py-4 font-semibold">
        Discussion {comments && comments.length > 0 && <span className="font-normal text-muted-foreground">· {comments.length}</span>}
      </h2>
      <form onSubmit={post} className="space-y-2 border-b border-ligne p-5">
        <textarea
          className="field min-h-16"
          maxLength={500}
          placeholder={profile ? "Ton avis sur ce mème…" : "Connecte-toi pour participer à la discussion"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!profile}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Respect, pas d&apos;arnaque ni de haine. Les messages sont modérés.</span>
          <button type="submit" className="btn-primary px-4 py-2" disabled={busy || (Boolean(profile) && body.trim().length === 0)}>
            {!profile ? "Se connecter" : busy ? "Envoi…" : "Publier"}
          </button>
        </div>
        {error && <p className="text-sm text-vente">{error}</p>}
      </form>
      {comments === null ? (
        <p className="p-5 text-sm text-muted-foreground">Chargement…</p>
      ) : comments.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">Aucun message. Lance la discussion !</p>
      ) : (
        <ul className="divide-y divide-ligne">
          {comments.map((c) => {
            const author = { wallet: c.author_wallet, pseudo: c.profiles?.pseudo ?? null };
            const canHide = profile && (profile.wallet === c.author_wallet || profile.role === "admin");
            return (
              <li key={c.id} className="flex gap-3 px-5 py-4">
                <Link href={`/profil/${c.author_wallet}`} className="shrink-0">
                  <Avatar wallet={c.author_wallet} pseudo={author.pseudo} url={c.profiles?.avatar_url} size={32} />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <Link href={`/profil/${c.author_wallet}`} className="font-medium hover:text-pervenche">
                      {displayName(author)}
                    </Link>
                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {ago(c.created_at)}
                    </span>
                    {canHide && (
                      <button type="button" onClick={() => void hide(c.id)} className="ml-auto text-xs text-muted-foreground hover:text-vente">
                        {profile.wallet === c.author_wallet ? "Supprimer" : "Masquer"}
                      </button>
                    )}
                  </p>
                  <p className="mt-1 text-sm break-words whitespace-pre-line text-foreground/90">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
