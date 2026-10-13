"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { MarketItem } from "@/components/market/MarketRow";
import { usd } from "@/lib/market-format";
import { memberImage, QG_DECOR, QG_RATIO, QG_ROOMS, QG_TEAM, QG_VIDEOS, type QgMember } from "@/lib/qg-scene";
import { MISSIONS } from "@/lib/qg-quete";
import { QgQuete, useQuete } from "./QgQuete";

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

/**
 * L'image du QG (l'équipe y est peinte à ses postes) et, par-dessus, tout ce qui est vivant :
 * zones cliquables sur chaque personnage, noms des pièces, bulles, effets et écran des tokens.
 * Tout est positionné en pourcentages de l'image, donc tout grandit ensemble.
 */
export function QgScene() {
  const team = QG_TEAM;
  const quete = useQuete();
  const [picked, setPicked] = useState<string | null>(null);
  // Sans choix du visiteur, on ouvre la prochaine mission de la quête
  const selected = team.find((m) => m.id === (picked ?? quete.next?.id ?? "jacques")) ?? team[0];
  const scroller = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Amène un personnage au centre de la salle (utile sur téléphone, où la salle déborde de l'écran)
  const center = (m: QgMember, smooth = true) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: el.scrollWidth * m.x - el.clientWidth / 2, behavior: smooth ? "smooth" : "auto" });
  };
  const choose = (m: QgMember) => setPicked(m.id);
  // Depuis le panneau (« Mission suivante ») : on montre le personnage et on garde sa mission en vue
  const goto = (id: string) => {
    const m = team.find((x) => x.id === id);
    if (!m) return;
    setPicked(id);
    center(m);
    panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // On arrive face au personnage de la prochaine mission
  useEffect(() => {
    center(selected, false);
    // une seule fois, à l'ouverture
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // À la souris, on fait glisser la salle comme au doigt ; un glissé n'ouvre pas la fiche d'un personnage
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !scroller.current) return;
    drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !scroller.current) return;
    if (Math.abs(e.clientX - d.x) > 5) d.moved = true;
    scroller.current.scrollLeft = d.left - (e.clientX - d.x);
  };
  const onPointerUp = () => {
    setTimeout(() => (drag.current = null), 0);
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-lg font-extrabold">La quête du frappeur</p>
        <span className="flex gap-1" aria-label={`${quete.done.length} missions réussies sur ${MISSIONS.length}`}>
          {MISSIONS.map((m) => (
            <span key={m.id} className={`text-lg leading-none ${quete.done.includes(m.id) ? "text-soleil" : "text-white/20"}`}>
              ★
            </span>
          ))}
        </span>
        <span className="text-sm text-muted-foreground">
          {quete.next ? `Prochaine mission : ${team.find((x) => x.id === quete.next?.id)?.nom ?? ""}` : "Quête terminée : ton diplôme t'attend chez Jacques !"}
        </span>
      </div>
      {/* La salle remplit presque tout l'écran en hauteur : on la voit de près et on se promène sur les côtés */}
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClickCapture={onClickCapture}
        className="relative -mx-4 cursor-grab overflow-x-auto overscroll-x-contain rounded-3xl [contain:inline-size] [scrollbar-width:none] active:cursor-grabbing sm:mx-0"
      >
        <section
          aria-label="Le QG de Tiers-État"
          className="relative overflow-hidden [container-type:inline-size] bg-[#2a1d14] select-none"
          style={{ height: "var(--qg-h)", width: `calc(var(--qg-h) * ${QG_RATIO})`, ["--qg-h" as string]: "clamp(420px, 78svh, 1000px)" }}
        >
          <img src={QG_DECOR} alt="" aria-hidden draggable={false} className="pointer-events-none absolute inset-0 size-full select-none object-cover" />

          {/* Les gestes de chacun : une courte vidéo en boucle posée exactement sur lui, bords fondus dans l'image */}
          {team
            .filter((m) => QG_VIDEOS.includes(m.id))
            .map(({ id, cadre: [x0, y0, x1, y1] }) => (
              <video
                key={id}
                src={`/images/qg/anim-${id}.mp4`}
                autoPlay
                muted
                loop
                playsInline
                aria-hidden
                className="qg-anim pointer-events-none absolute object-fill"
                style={{ ...at(x0, y0), width: pct(x1 - x0), height: pct(y1 - y0) }}
              />
            ))}

          <QgEffects />

          <QgScreen />

          {QG_ROOMS.map((r) => (
            <Link
              key={r.label}
              href={r.href}
              className={`${r.enseigne ? "qg-enseigne" : "qg-panneau"} absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display font-extrabold`}
              style={{ left: pct(r.x), top: pct(r.y) }}
            >
              {r.label}
            </Link>
          ))}

          {team.map((m, i) => {
            const active = m.id === selected.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => choose(m)}
                aria-label={`${m.nom}, ${m.role}`}
                aria-pressed={active}
                className={`group absolute -translate-x-1/2 -translate-y-full outline-none [-webkit-tap-highlight-color:transparent] ${active ? "z-20" : "z-10 hover:z-20"}`}
                style={{ left: pct(m.x), top: pct(m.y), height: pct(m.h), width: pct(m.w) }}
              >
                {/* Repère de quête : « ! » sur le personnage qui attend le joueur, ✓ quand sa mission est réussie */}
                {quete.next?.id === m.id ? (
                  <span aria-hidden className="qg-repere absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full">!</span>
                ) : quete.done.includes(m.id) ? (
                  <span aria-hidden className="qg-repere-ok absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full">✓</span>
                ) : null}
                <span
                  aria-hidden
                  className={`qg-bulle absolute top-[2%] ${m.id === "gavroche" ? "right-[78%]" : "left-[78%]"}`}
                  style={{ animationDelay: `${i * 3}s` }}
                >
                  {m.bulle}
                </span>
                <span
                  className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-full bg-[#0b0d2a]/85 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/15 opacity-0 transition [@media(hover:hover)]:group-hover:opacity-100`}
                >
                  {m.nom}
                </span>
              </button>
            );
          })}
        </section>
      </div>

      <div ref={panel} className="scroll-mt-24">
        <QgQuete key={selected.id} member={selected} onGoto={goto} onStart={() => setPicked(selected.id)} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [contain:inline-size] [scrollbar-width:none]">
        {team.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => goto(m.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-sm font-semibold ring-1 transition ${m.id === selected.id ? "bg-white/15 ring-white/30" : "bg-white/[0.04] ring-white/10 hover:bg-white/10"}`}
          >
            <img src={memberImage(m.id)} alt="" className="size-8 rounded-full bg-white/10 object-contain object-top" />
            {m.nom}
            {quete.done.includes(m.id) && <span className="text-achat">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

const at = (x: number, y: number) => ({ left: pct(x), top: pct(y) });


/** Étincelles de l'enclume : elles jaillissent régulièrement sous le marteau de Louis. */
const SPARKS = [
  [-2.2, -2.6], [-1.2, -3.4], [0.4, -3.8], [1.6, -3], [2.4, -1.8], [-2.8, -1.2], [1, -2.2], [-0.4, -2.9],
] as const;

/**
 * Ce que l'équipe fabrique, animé par-dessus l'image : les écrans, la presse, la forge, le coffre, le café.
 * Les tailles sont en cqw (largeur de la scène) pour tout garder proportionné.
 */
function QgEffects() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* À la une : les feuilles sortent de la presse de Camille et s'envolent */}
      {[0, 1, 2].map((k) => (
        <span
          key={k}
          className="qg-feuille absolute"
          style={{ ...at(0.31, 0.47), animationDelay: `${k * 1.1}s`, ["--dx" as string]: `${1 + k * 0.8}cqw`, ["--dy" as string]: `${-3 - k}cqw`, ["--r" as string]: `${30 + k * 40}deg` }}
        />
      ))}

      {/* La Frappe : le four respire, les étincelles jaillissent de l'enclume */}
      <span className="qg-feu absolute rounded-full" style={at(0.638, 0.55)} />
      {SPARKS.map(([dx, dy], k) => (
        <span
          key={k}
          className="qg-etincelle absolute rounded-full"
          style={{ ...at(0.594, 0.566), ["--dx" as string]: `${dx * 0.55}cqw`, ["--dy" as string]: `${dy * 0.55}cqw` }}
        />
      ))}

      {/* Le Coffre : les piles d'or, la roue du coffre, les clés et la presse à pièces brillent */}
      {[
        [0.843, 0.566, 0],
        [0.833, 0.59, 1.3],
        [0.785, 0.387, 2.1],
        [0.744, 0.65, 3.2],
        [0.675, 0.753, 0.6],
      ].map(([x, y, d], k) => (
        <span key={k} className="qg-eclat absolute" style={{ ...at(x, y), animationDelay: `${d}s` }} />
      ))}

      {/* La table de Jacques : l'hologramme pulse */}
      <span className="qg-holo absolute rounded-[50%]" style={{ ...at(0.345, 0.57), width: pct(0.15), height: pct(0.05) }} />

      {/* Le Café : la vapeur monte de la machine à espresso et de la tasse de Gavroche */}
      {[
        [0.979, 0.44, 0],
        [0.985, 0.44, 1.2],
        [0.94, 0.355, 2.1],
      ].map(([x, y, d], k) => (
        <span key={k} className="qg-vapeur absolute rounded-full" style={{ ...at(x, y), animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

/** Le grand écran de la salle : uniquement les tokens lancés sur Tiers-État, mis à jour toutes les 20 s. */
function QgScreen() {
  const [items, setItems] = useState<MarketItem[] | null>(null);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const j = (await (await fetch("/api/listes?tri=tiers-etat")).json()) as { items: MarketItem[] };
        if (!stop) setItems(j.items.slice(0, 5));
      } catch {
        /* réseau indisponible : on garde l'écran tel quel */
      }
    };
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  // Tant qu'aucun token n'est lancé, l'écran du décor reste tel quel
  if (!items || items.length === 0) return null;

  return (
    <div className="qg-screen absolute flex flex-col overflow-hidden" style={{ ...at(0.357, 0.235), width: pct(0.146), height: pct(0.215) }}>
      <div className="flex items-center justify-between border-b border-[#5ec8ff]/25 pb-[0.3em]">
        <span className="font-extrabold tracking-wide text-[#5ec8ff]">LANCÉS SUR TIERS-ÉTAT</span>
        <span className="flex items-center gap-[0.3em] text-[#3dffb0]">
          <span className="qg-live inline-block size-[0.5em] rounded-full bg-[#3dffb0]" />
          EN DIRECT
        </span>
      </div>
      <ul className="mt-[0.3em] flex flex-1 flex-col justify-between">
        {items.map((t) => (
          <li key={t.address} className="qg-ligne-in">
            <Link href={t.href ?? `/token/${t.address}`} className="flex items-center gap-[0.5em] hover:text-[#5ec8ff]">
              {t.imageUrl ? <img src={t.imageUrl} alt="" className="size-[1.3em] rounded-full object-cover" /> : <span className="grid size-[1.3em] place-items-center rounded-full bg-white/15 text-[0.8em] font-bold">{t.symbol.slice(0, 1)}</span>}
              <span className="flex-1 truncate font-bold">${t.symbol}</span>
              <span className="text-white/70">{usd(t.mcapUsd)}</span>
              {t.progress !== undefined && (
                <span className="relative h-[0.45em] w-[4em] overflow-hidden rounded-full bg-white/15">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#3d5afe] via-[#9b6bff] to-[#ff3d68]" style={{ width: `${Math.min(100, t.progress)}%` }} />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
