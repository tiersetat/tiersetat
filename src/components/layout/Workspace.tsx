"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LiveActivity } from "@/components/social/LiveActivity";
import { TokensPanel } from "@/components/market/TokensPanel";

const QUERY = "(min-width: 1280px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

type Panels = { social: number; tokens: number; socialOpen: boolean; tokensOpen: boolean };
const DEFAULT: Panels = { social: 300, tokens: 360, socialOpen: true, tokensOpen: true };
const KEY = "te_workspace_v1";
const MIN = 220;
const MAX = 560;

/** Barre verticale à tirer à la souris pour régler la largeur d'un panneau. */
function Grip({ onDrag, onEnd, label }: { onDrag: (dx: number) => void; onEnd: () => void; label: string }) {
  const last = useRef<number | null>(null);
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onDrag(16);
        if (e.key === "ArrowLeft") onDrag(-16);
        if (e.key.startsWith("Arrow")) onEnd();
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        last.current = e.clientX;
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(e) => {
        if (last.current === null) return;
        onDrag(e.clientX - last.current);
        last.current = e.clientX;
      }}
      onPointerUp={() => {
        last.current = null;
        document.body.style.userSelect = "";
        onEnd();
      }}
      className="group flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center outline-none"
    >
      <span className="h-14 w-1 rounded-full bg-white/20 transition group-hover:bg-white/60 group-focus-visible:bg-white" />
    </div>
  );
}

/** Bouton pour replier / déplier un panneau. */
function Toggle({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="chip px-3 py-1 text-xs" aria-pressed={open}>
      {open ? `Masquer` : label}
    </button>
  );
}

/**
 * Espace de travail (grand écran) : panneaux Social et Tokens toujours visibles à gauche de la page ouverte,
 * redimensionnables à la souris et repliables. Sur téléphone et sur l'accueil (qui a déjà ses listes), la page seule.
 */
export function Workspace({ children }: { children: ReactNode }) {
  const path = usePathname();
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  const [p, setP] = useState<Panels>(DEFAULT);
  const cur = useRef(p);
  useEffect(() => {
    cur.current = p;
  }, [p]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Panels | null;
      if (saved) Promise.resolve().then(() => setP({ ...DEFAULT, ...saved }));
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cur.current));
    } catch {
      /* stockage indisponible */
    }
  };
  const update = (patch: Partial<Panels>) =>
    setP((v) => {
      const n = { ...v, ...patch };
      cur.current = n;
      return n;
    });

  // Pages sans panneaux : téléphone, accueil (déjà Social + Tokens), connexion et pages légales
  const bare = !wide || path === "/" || path.startsWith("/cgu") || path.startsWith("/mentions-legales") || path.startsWith("/qg");
  if (bare) return <>{children}</>;

  const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v));
  return (
    <div className="flex items-start gap-1">
      {p.socialOpen && (
        <>
          <aside className="sticky top-4 flex h-[calc(100vh-2rem)] shrink-0 flex-col gap-2" style={{ width: p.social }}>
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-extrabold">Social</h2>
              <Toggle open onClick={() => (update({ socialOpen: false }), save())} label="Social" />
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
              <LiveActivity limit={20} />
            </div>
          </aside>
          <div className="sticky top-4 flex h-[calc(100vh-2rem)]">
            <Grip label="Largeur du panneau Social" onDrag={(dx) => update({ social: clamp(cur.current.social + dx) })} onEnd={save} />
          </div>
        </>
      )}
      {p.tokensOpen && (
        <>
          <aside className="sticky top-4 h-[calc(100vh-2rem)] shrink-0" style={{ width: p.tokens }}>
            <div className="absolute right-1 top-0 z-10">
              <Toggle open onClick={() => (update({ tokensOpen: false }), save())} label="Tokens" />
            </div>
            <TokensPanel />
          </aside>
          <div className="sticky top-4 flex h-[calc(100vh-2rem)]">
            <Grip label="Largeur du panneau Tokens" onDrag={(dx) => update({ tokens: clamp(cur.current.tokens + dx) })} onEnd={save} />
          </div>
        </>
      )}
      <div className="min-w-0 flex-1 space-y-3">
        {(!p.socialOpen || !p.tokensOpen) && (
          <div className="flex gap-2">
            {!p.socialOpen && <Toggle open={false} onClick={() => (update({ socialOpen: true }), save())} label="Afficher Social" />}
            {!p.tokensOpen && <Toggle open={false} onClick={() => (update({ tokensOpen: true }), save())} label="Afficher Tokens" />}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
