"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/social/Avatar";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { displayName } from "@/lib/display";
import { QG_DISCLAIMER, checkQgMessage } from "@/lib/qg";
import { GIF_PREFIX, gifOf, normalizeGifUrl } from "@/lib/gif";

type Msg = {
  id: number;
  body: string;
  created_at: string;
  author_wallet: string;
  profiles: { pseudo: string | null; avatar_url: string | null } | null;
};
type QgState = { members: number; canPost: boolean; isCreator: boolean; signedIn: boolean };
type Gif = { id: string; title: string; preview: string; url: string };

const POLL_MS = 4_000;
const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Le GIF ou le texte d'un message. */
function Body({ body }: { body: string }) {
  const gif = gifOf(body);
  if (gif) {
    // eslint-disable-next-line @next/next/no-img-element -- GIF Giphy ou Tenor (liste blanche)
    return <img src={gif} alt="GIF" loading="lazy" className="max-h-56 max-w-full rounded-xl" />;
  }
  return <p className="break-words whitespace-pre-line">{body}</p>;
}

/** Fenêtre GIF : recherche Giphy si le serveur a sa clé, sinon un lien Giphy ou Tenor à coller. */
function GifPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Gif[] | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const id = setTimeout(async () => {
      try {
        const j = (await (await fetch(`/api/gifs?q=${encodeURIComponent(q || "memecoin")}`)).json()) as { items: Gif[]; needKey?: boolean };
        if (stop) return;
        setNeedKey(Boolean(j.needKey));
        setItems(j.items);
      } catch {
        if (!stop) setItems([]);
      }
    }, 300);
    return () => {
      stop = true;
      clearTimeout(id);
    };
  }, [q]);

  return (
    <div className="space-y-2 rounded-2xl border border-white/12 bg-[#0b0d2a]/95 p-3">
      <div className="flex items-center gap-2">
        {!needKey && <input className="field py-2" placeholder="Chercher un GIF (pump, money, moon…)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />}
        <button type="button" onClick={onClose} className="chip ml-auto shrink-0 px-3 py-1.5 text-xs">
          Fermer
        </button>
      </div>
      {!needKey && (
        <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
          {items === null
            ? Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-white/[0.06]" />)
            : items.map((g) => (
                <button key={g.id} type="button" onClick={() => onPick(g.url)} className="ios-press overflow-hidden rounded-lg" title={g.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- aperçu Giphy */}
                  <img src={g.preview} alt={g.title} loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const url = normalizeGifUrl(link);
          if (!url) return setLinkError("Lien non reconnu : copie le lien d'un GIF Giphy ou Tenor (il finit par .gif).");
          onPick(url);
        }}
      >
        <input className="field py-2" placeholder="…ou colle un lien GIF Giphy / Tenor" value={link} onChange={(e) => (setLink(e.target.value), setLinkError(null))} />
        <button type="submit" className="btn-ghost min-h-10 shrink-0 px-4 py-2 text-sm">
          Envoyer
        </button>
      </form>
      {linkError && <p className="text-xs text-vente">{linkError}</p>}
      {!needKey && <p className="text-right text-[10px] text-muted-foreground">Propulsé par GIPHY</p>}
    </div>
  );
}

/**
 * La communauté d'un mème, façon messagerie : le créateur et tous les traders du mème.
 * Les annonces du créateur sont épinglées ; tout le monde lit, les détenteurs écrivent (texte ou GIF).
 */
export function CommunityChat({ mint, ticker, creator }: { mint: string; ticker: string; creator: string }) {
  const { profile, signIn } = useSession();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [qg, setQg] = useState<QgState | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [reported, setReported] = useState<number[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = useRef<number | null>(null);

  const load = useCallback(async () => {
    const supabase = supabaseBrowser();
    if (!supabase) return setMsgs([]);
    const { data } = await supabase
      .from("comments")
      .select("id, body, created_at, author_wallet, profiles!comments_author_wallet_fkey(pseudo, avatar_url)")
      .eq("mint", mint)
      .order("created_at", { ascending: false })
      .limit(150);
    setMsgs(((data ?? []) as unknown as Msg[]).reverse());
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

  // Descend au dernier message quand il en arrive un nouveau
  useEffect(() => {
    const newest = msgs?.at(-1)?.id ?? null;
    if (newest !== null && newest !== lastId.current) {
      lastId.current = newest;
      bottom.current?.scrollIntoView({ block: "end" });
    }
  }, [msgs]);

  const isCreator = profile?.wallet === creator;
  const canPost = Boolean(profile) && (isCreator || Boolean(qg?.canPost));

  async function send(text: string) {
    if (!profile) return void signIn();
    const local = checkQgMessage(text);
    if (!local.ok) return setError(local.reason);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mint, body: text }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Envoi impossible");
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (await send(body.trim())) setBody("");
  }

  async function report(m: Msg) {
    setReported((r) => [...r, m.id]);
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mint, reason: "arnaque", details: `Message de la communauté n° ${m.id} : ${m.body}`.slice(0, 500) }),
    }).catch(() => undefined);
  }

  async function hide(id: number) {
    const res = await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setMsgs((list) => (list ?? []).filter((m) => m.id !== id));
  }

  const pinned = (msgs ?? []).filter((m) => m.author_wallet === creator && !gifOf(m.body)).slice(-2).reverse();

  return (
    <div className="flex min-h-[70vh] flex-col gap-3">
      {pinned.length > 0 && (
        <div className="surface space-y-2 p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-pervenche">Annonces du créateur</p>
          {pinned.map((m) => (
            <p key={m.id} className="rounded-xl bg-white/[0.05] px-3 py-2 text-sm">
              {m.body}
            </p>
          ))}
        </div>
      )}

      <div className="surface flex-1 space-y-3 overflow-hidden p-3 sm:p-4">
        {msgs === null ? (
          <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
        ) : msgs.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">La communauté vient d&apos;ouvrir. Le premier message, c&apos;est toi ?</p>
        ) : (
          <ul className="space-y-3">
            {msgs.map((m) => {
              const mine = profile?.wallet === m.author_wallet;
              const fromCreator = m.author_wallet === creator;
              const author = { wallet: m.author_wallet, pseudo: m.profiles?.pseudo ?? null };
              return (
                <li key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && (
                    <Link href={`/profil/${m.author_wallet}`} className="shrink-0">
                      <Avatar wallet={m.author_wallet} pseudo={author.pseudo} url={m.profiles?.avatar_url} size={28} />
                    </Link>
                  )}
                  <div className={`max-w-[80%] space-y-1 ${mine ? "items-end text-right" : ""}`}>
                    {!mine && (
                      <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground/80">{displayName(author)}</span>
                        {fromCreator && <span className="rounded-full bg-white/12 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-pervenche">Créateur</span>}
                      </p>
                    )}
                    <div className={`inline-block rounded-2xl px-3 py-2 text-left text-[15px] ${mine ? "rounded-br-md bg-electrique/80 text-white" : fromCreator ? "rounded-bl-md bg-white/[0.12]" : "rounded-bl-md bg-white/[0.07]"}`}>
                      <Body body={m.body} />
                    </div>
                    <p className={`flex gap-3 px-1 text-[10px] text-muted-foreground ${mine ? "justify-end" : ""}`}>
                      <span suppressHydrationWarning>{time(m.created_at)}</span>
                      {profile && !mine && (
                        <button type="button" onClick={() => void report(m)} disabled={reported.includes(m.id)} className="hover:text-vente disabled:opacity-60">
                          {reported.includes(m.id) ? "Signalé" : "Signaler"}
                        </button>
                      )}
                      {profile && (mine || profile.role === "admin") && (
                        <button type="button" onClick={() => void hide(m.id)} className="hover:text-vente">
                          {mine ? "Supprimer" : "Masquer"}
                        </button>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottom} />
      </div>

      {/* Zone d'écriture, collée en bas de l'écran au-dessus de la barre de navigation */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-20 space-y-2 lg:bottom-4">
        {gifOpen && canPost && (
          <GifPicker
            onClose={() => setGifOpen(false)}
            onPick={async (url) => {
              if (await send(`${GIF_PREFIX}${url}`)) setGifOpen(false);
            }}
          />
        )}
        {error && <p className="rounded-xl bg-vente/15 px-3 py-2 text-sm text-vente">{error}</p>}
        {!profile ? (
          <button type="button" onClick={() => void signIn()} className="btn-fete w-full">
            Se connecter pour rejoindre la communauté
          </button>
        ) : !canPost ? (
          <Link href={`/token/${mint}`} className="btn-fete w-full">
            Rejoindre : achète un peu de ${ticker} pour écrire
          </Link>
        ) : (
          <form onSubmit={submit} className="ios-glass flex items-center gap-2 rounded-full p-1.5">
            <button type="button" onClick={() => setGifOpen((v) => !v)} aria-expanded={gifOpen} className="chip shrink-0 px-3 py-2 text-xs font-extrabold">
              GIF
            </button>
            <input
              className="min-w-0 flex-1 bg-transparent px-2 text-[15px] outline-none placeholder:text-muted-foreground"
              maxLength={500}
              placeholder={isCreator ? "Une annonce pour ta communauté…" : `Message à la communauté $${ticker}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button type="submit" disabled={busy || !body.trim()} className="btn-primary min-h-10 shrink-0 px-4 py-2 text-sm">
              {busy ? "…" : "Envoyer"}
            </button>
          </form>
        )}
        <p className="px-2 text-center text-[10px] text-muted-foreground">
          {qg ? `${qg.members} membre${qg.members > 1 ? "s" : ""} · ` : ""}Pas de promesse de gains ni d&apos;achats groupés. {QG_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
