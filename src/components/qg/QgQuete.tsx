"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { celebrate } from "@/lib/celebrate";
import { MISSIONS, QUETE_KEY, type Reponse } from "@/lib/qg-quete";
import { memberImage, QG_TEAM, type QgMember } from "@/lib/qg-scene";

/* Avancée de la quête : gardée dans le navigateur (simple confort, aucune récompense n'en dépend). */
const listeners = new Set<() => void>();
let cache: string | null = null;
function read(): string {
  if (cache === null) {
    try {
      cache = localStorage.getItem(QUETE_KEY) ?? "";
    } catch {
      cache = "";
    }
  }
  return cache;
}
function write(ids: string[]) {
  cache = ids.join(",");
  try {
    localStorage.setItem(QUETE_KEY, cache);
  } catch {
    /* stockage indisponible : la quête vaut pour cette visite */
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Missions réussies, dans l'ordre, et la prochaine à faire (null quand la quête est terminée). */
export function useQuete() {
  const raw = useSyncExternalStore(subscribe, read, () => "");
  const done = raw ? raw.split(",").filter(Boolean) : [];
  const next = MISSIONS.find((m) => !done.includes(m.id)) ?? null;
  return {
    done,
    next,
    finish: (id: string) => !done.includes(id) && write([...done, id]),
    reset: () => write([]),
  };
}

const nameOf = (id: string) => QG_TEAM.find((m) => m.id === id)?.nom ?? id;

/** Le panneau du personnage choisi : sa mission (dialogue, question), ou ce qu'il faut faire avant. */
export function QgQuete({ member, onGoto, onStart }: { member: QgMember; onGoto: (id: string) => void; /** Le joueur a commencé : ce personnage reste affiché jusqu'à ce qu'il en choisisse un autre */ onStart: () => void }) {
  const { done, next, finish, reset } = useQuete();
  const index = MISSIONS.findIndex((m) => m.id === member.id);
  const mission = MISSIONS[index];
  const isDone = done.includes(member.id);
  const unlocked = isDone || next?.id === member.id;
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<Reponse | null>(null);
  const [replay, setReplay] = useState(false);

  // Quête finie : Jacques remet le diplôme (on peut quand même rejouer sa mission)
  if (!next && member.id === "jacques" && !replay) {
    return <Diplome onReplay={() => setReplay(true)} onReset={reset} member={member} />;
  }

  const talking = step < mission.dialogue.length;
  const choose = (r: Reponse) => {
    onStart();
    setAnswer(r);
    if (r.bonne && !isDone) {
      finish(member.id);
      void celebrate(index === MISSIONS.length - 1 ? "launch" : "buy");
    }
  };
  const following = MISSIONS[index + 1];
  // La bonne réponse ne tombe pas toujours au même endroit d'une mission à l'autre
  const shift = (index * 2 + 1) % mission.reponses.length;
  const reponses = [...mission.reponses.slice(shift), ...mission.reponses.slice(0, shift)];

  return (
    <article className="surface qg-info overflow-hidden">
      <div className="flex items-start gap-4 p-5 md:p-6">
        <img src={memberImage(member.id)} alt="" className="h-24 w-auto shrink-0 object-contain md:h-32" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${member.color}`}>
              Mission {index + 1}/{MISSIONS.length} · {member.role}
            </p>
            {isDone && <span className="rounded-full bg-achat/15 px-2 py-0.5 text-xs font-bold text-achat">✓ Réussie</span>}
          </div>
          <h2 className="font-display text-2xl font-extrabold">
            {member.nom} : {mission.titre}
          </h2>

          {!unlocked ? (
            <div className="space-y-3">
              <p className="qg-dialogue">« Pas si vite, citoyen ! Commence par la mission de {nameOf(next?.id ?? "jacques")}, je t&apos;attends ici. »</p>
              <button type="button" onClick={() => onGoto(next?.id ?? "jacques")} className="btn-fete">
                Aller voir {nameOf(next?.id ?? "jacques")}
              </button>
            </div>
          ) : talking ? (
            <div className="space-y-3">
              <p key={step} className="qg-dialogue">« {mission.dialogue[step]} »</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onStart();
                    setStep((s) => s + 1);
                  }}
                  className="btn-fete"
                >
                  {step === mission.dialogue.length - 1 ? "Je suis prêt !" : "Suite ▸"}
                </button>
                <span className="flex gap-1.5" aria-label={`Bulle ${step + 1} sur ${mission.dialogue.length}`}>
                  {mission.dialogue.map((_, k) => (
                    <span key={k} className={`size-2 rounded-full ${k <= step ? "bg-soleil" : "bg-white/20"}`} />
                  ))}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-bold">{mission.question}</p>
              <div className="grid gap-2">
                {reponses.map((r) => {
                  const picked = answer === r;
                  return (
                    <button
                      key={r.texte}
                      type="button"
                      disabled={Boolean(answer?.bonne)}
                      onClick={() => choose(r)}
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ring-1 transition ${
                        picked ? (r.bonne ? "bg-achat/15 text-achat ring-achat/50" : "bg-vente/15 text-vente ring-vente/50") : "bg-white/[0.04] ring-white/10 hover:bg-white/10 disabled:opacity-50"
                      }`}
                    >
                      {r.texte}
                    </button>
                  );
                })}
              </div>
              {answer && <p className={`qg-dialogue ${answer.bonne ? "" : "border-vente/40"}`}>« {answer.explication} »</p>}
              {answer?.bonne && (
                <div className="flex flex-wrap gap-2">
                  {following ? (
                    <button type="button" onClick={() => onGoto(following.id)} className="btn-fete">
                      Mission suivante : {nameOf(following.id)} ▸
                    </button>
                  ) : (
                    <button type="button" onClick={() => onGoto("jacques")} className="btn-fete">
                      Recevoir mon diplôme ▸
                    </button>
                  )}
                  <Link href={mission.action.href} className="btn-ghost">
                    {mission.action.label}
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <details className="border-t border-ligne px-5 py-3 text-sm text-muted-foreground md:px-6">
        <summary className="cursor-pointer font-semibold text-foreground">Pourquoi ce nom ?</summary>
        <p className="mt-2">{member.pourquoi}</p>
      </details>
    </article>
  );
}

/** Fin de la quête : le diplôme, et l'invitation à frapper pour de vrai. */
function Diplome({ member, onReplay, onReset }: { member: QgMember; onReplay: () => void; onReset: () => void }) {
  return (
    <article className="surface qg-info space-y-4 p-6 text-center md:p-8">
      <img src={memberImage(member.id)} alt="" className="mx-auto h-28 w-auto object-contain" />
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-soleil">Quête terminée · 6/6</p>
      <h2 className="font-display text-3xl font-extrabold">Diplôme de citoyen frappeur</h2>
      <p className="mx-auto max-w-xl text-muted-foreground">
        « Bravo ! Tu sais trouver une idée, frapper ton token, inspirer confiance, suivre la courbe jusqu&apos;à la Bastille et faire connaître ton mème honnêtement. Le peuple t&apos;attend. »
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/lancer" className="btn-fete">
          Frapper mon token
        </Link>
        <button type="button" onClick={onReplay} className="btn-ghost">
          Revoir la mission de Jacques
        </button>
        <button type="button" onClick={onReset} className="btn-ghost">
          Recommencer la quête
        </button>
      </div>
    </article>
  );
}
