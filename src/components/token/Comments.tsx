"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/social/Avatar";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { displayName } from "@/lib/display";
import { QG_DISCLAIMER, checkQgMessage } from "@/lib/qg";

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

type QgState = { members: number; canPost: boolean; isCreator: boolean; signedIn: boolean; creator: string };

/**
 * Le QG d'un mème : les annonces de son créateur épinglées en haut, puis le salon où seuls les détenteurs écrivent.
 * Tout le monde peut lire (ça donne envie d'entrer). Actualisé toutes les 15 s.
 */
export function Comments({ mint, ticker, creator }: { mint: string; ticker: string; creator: string }) {
  const { profile, signIn } = useSession();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [qg, setQg] = useState<QgState | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState<number[]>([]);

  useEffect(() => {
    let stop = false;
    fetch(`/api/qg?mint=${mint}`)
      .then((r) => r.json())
      .then((j: QgState) => !stop && setQg(j))
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [mint, profile?.wallet]);

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
    const local = checkQgMessage(body);
    if (!local.ok) return setError(local.reason);
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

  async function report(c: Comment) {
    setReported((r) => [...r, c.id]);
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mint, reason: "arnaque", details: `Message du QG n° ${c.id} : ${c.body}`.slice(0, 500) }),
    }).catch(() => undefined);
  }

  async function hide(id: number) {
    const res = await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setComments((list) => (list ?? []).filter((c) => c.id !== id));
  }

  const isCreatorPost = (c: Comment) => c.author_wallet === creator;
  const announcements = (comments ?? []).filter(isCreatorPost).slice(0, 3);
  const messages = (comments ?? []).filter((c) => !isCreatorPost(c));
  const isCreator = profile?.wallet === creator;
  const canPost = Boolean(profile) && (isCreator || qg?.canPost);

  const item = (c: Comment, pinned = false) => {
    const author = { wallet: c.author_wallet, pseudo: c.profiles?.pseudo ?? null };
    const canHide = profile && (profile.wallet === c.author_wallet || profile.role === "admin");
    return (
      <li key={c.id} className={`flex gap-3 px-5 py-4 ${pinned ? "bg-white/[0.04]" : ""}`}>
        <Link href={`/profil/${c.author_wallet}`} className="shrink-0">
          <Avatar wallet={c.author_wallet} pseudo={author.pseudo} url={c.profiles?.avatar_url} size={32} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <Link href={`/profil/${c.author_wallet}`} className="font-medium hover:text-pervenche">
              {displayName(author)}
            </Link>
            {isCreatorPost(c) && <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pervenche">Créateur</span>}
            <span className="text-xs text-muted-foreground" suppressHydrationWarning>
              {ago(c.created_at)}
            </span>
            <span className="ml-auto flex gap-3">
              {profile && profile.wallet !== c.author_wallet && (
                <button type="button" onClick={() => void report(c)} disabled={reported.includes(c.id)} className="text-xs text-muted-foreground hover:text-vente disabled:opacity-60">
                  {reported.includes(c.id) ? "Signalé, merci" : "Signaler"}
                </button>
              )}
              {canHide && (
                <button type="button" onClick={() => void hide(c.id)} className="text-xs text-muted-foreground hover:text-vente">
                  {profile.wallet === c.author_wallet ? "Supprimer" : "Masquer"}
                </button>
              )}
            </span>
          </p>
          <p className="mt-1 text-sm break-words whitespace-pre-line text-foreground/90">{c.body}</p>
        </div>
      </li>
    );
  };

  return (
    <section className="surface overflow-hidden">
      <div className="space-y-1 border-b border-ligne px-5 py-4">
        <h2 className="flex flex-wrap items-baseline gap-x-2 text-lg font-extrabold">
          QG ${ticker}
          {qg && (
            <span className="text-sm font-normal text-muted-foreground">
              · {qg.members} membre{qg.members > 1 ? "s" : ""}
            </span>
          )}
        </h2>
        <p className="text-xs text-muted-foreground">La communauté du mème. Tout le monde lit, seuls les détenteurs écrivent. {QG_DISCLAIMER}</p>
      </div>

      {announcements.length > 0 && (
        <div className="border-b border-ligne">
          <p className="px-5 pt-3 text-[11px] font-bold uppercase tracking-widest text-pervenche">Annonces du créateur</p>
          <ul className="divide-y divide-ligne">{announcements.map((c) => item(c, true))}</ul>
        </div>
      )}

      <form onSubmit={post} className="space-y-2 border-b border-ligne p-5">
        <textarea
          className="field min-h-16"
          maxLength={500}
          placeholder={
            !profile
              ? "Connecte-toi pour rejoindre le QG"
              : isCreator
                ? "Une annonce pour ta communauté : t-shirts, live, défi de la semaine…"
                : canPost
                  ? `Ton message pour le QG $${ticker}…`
                  : `Réservé aux détenteurs : achète un peu de $${ticker} pour écrire ici.`
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!canPost}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Promotion libre. Interdit : promettre des gains, organiser des achats groupés, viser une vraie personne.</span>
          <button type="submit" className="btn-primary shrink-0 px-4 py-2" disabled={busy || (Boolean(profile) && (!canPost || body.trim().length === 0))}>
            {!profile ? "Se connecter" : busy ? "Envoi…" : isCreator ? "Annoncer" : "Publier"}
          </button>
        </div>
        {error && <p className="text-sm text-vente">{error}</p>}
      </form>
      {comments === null ? (
        <p className="p-5 text-sm text-muted-foreground">Chargement…</p>
      ) : messages.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">Le QG est encore calme. {canPost ? "Lance la discussion !" : "Les premiers détenteurs vont l'animer."}</p>
      ) : (
        <ul className="divide-y divide-ligne">{messages.map((c) => item(c))}</ul>
      )}
    </section>
  );
}
