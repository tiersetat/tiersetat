"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function useStoredSize(key: string, initial: number, min: number, max: number) {
  const [size, setSize] = useState(initial);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(key));
      if (v >= min && v <= max) Promise.resolve().then(() => setSize(v));
    } catch {
      /* stockage indisponible */
    }
  }, [key, min, max]);
  const save = (v: number) => {
    try {
      localStorage.setItem(key, String(Math.round(v)));
    } catch {
      /* stockage indisponible */
    }
  };
  return [size, setSize, save] as const;
}

/** Poignée de redimensionnement (souris ou doigt). */
function Handle({ axis, onDrag, onEnd, label }: { axis: "x" | "y"; onDrag: (delta: number) => void; onEnd: () => void; label: string }) {
  const last = useRef<number | null>(null);
  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 12;
        if ((axis === "x" && e.key === "ArrowRight") || (axis === "y" && e.key === "ArrowDown")) onDrag(step);
        if ((axis === "x" && e.key === "ArrowLeft") || (axis === "y" && e.key === "ArrowUp")) onDrag(-step);
        if (e.key.startsWith("Arrow")) {
          e.preventDefault();
          onEnd();
        }
      }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        last.current = axis === "x" ? e.clientX : e.clientY;
      }}
      onPointerMove={(e) => {
        if (last.current === null) return;
        const cur = axis === "x" ? e.clientX : e.clientY;
        onDrag(cur - last.current);
        last.current = cur;
      }}
      onPointerUp={() => {
        last.current = null;
        onEnd();
      }}
      className={`group flex touch-none items-center justify-center outline-none ${axis === "x" ? "w-4 cursor-col-resize self-stretch" : "h-6 cursor-row-resize"}`}
    >
      <span className={`rounded-full bg-white/25 transition group-hover:bg-white/60 group-focus-visible:bg-white ${axis === "x" ? "h-12 w-1" : "h-1 w-12"}`} />
    </div>
  );
}

/** Deux colonnes dont la largeur de gauche se règle à la souris (ordinateur), mémorisée. */
export function ResizableColumns({ left, children }: { left: ReactNode; children: ReactNode }) {
  const [w, setW, save] = useStoredSize("te_col_social", 352, 240, 620);
  const cur = useRef(w);
  useEffect(() => {
    cur.current = w;
  }, [w]);
  return (
    <div className="lg:flex lg:items-start">
      <aside className="hidden shrink-0 lg:sticky lg:top-6 lg:block" style={{ width: w }}>
        {left}
      </aside>
      <div className="hidden lg:sticky lg:top-6 lg:flex lg:h-[70vh]">
        <Handle axis="x" label="Largeur du panneau Social" onDrag={(d) => setW((v) => Math.max(240, Math.min(620, v + d)))} onEnd={() => save(cur.current)} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Panneau dont la hauteur se règle avec la poignée du bas (téléphone), mémorisée. */
export function ResizableHeight({ id, initial, children }: { id: string; initial: number; children: ReactNode }) {
  const [h, setH, save] = useStoredSize(`te_h_${id}`, initial, 140, 900);
  const cur = useRef(h);
  useEffect(() => {
    cur.current = h;
  }, [h]);
  return (
    <div>
      <div className="no-scrollbar overflow-y-auto overscroll-contain rounded-3xl" style={{ height: h }}>
        {children}
      </div>
      <Handle axis="y" label="Hauteur du panneau" onDrag={(d) => setH((v) => Math.max(140, Math.min(900, v + d)))} onEnd={() => save(cur.current)} />
    </div>
  );
}
