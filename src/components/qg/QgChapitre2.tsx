"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { QUESTS, questsOf, type QuestStats } from "@/lib/quetes";
import { memberImage, QG_TEAM } from "@/lib/qg-scene";

type MyToken = { mint: string; name: string; ticker: string; image_url: string };
type Data = { signedIn: boolean; tokens?: MyToken[]; mint?: string | null; stats?: QuestStats };

/**
 * Chapitre 2 du QG : « Faire grandir ton mème ». Dix quêtes réelles, vérifiées sur les données du mème
 * (détenteurs, annonces, courbe…), chacune guidée par un personnage du QG.
 */
export function QgChapitre2() {
  const { profile, signIn } = useSession();
  const [data, setData] = useState<Data | null>(null);
  const [mint, setMint] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    const load = () =>
      fetch(`/api/quetes${mint ? `?mint=${mint}` : ""}`)
        .then((r) => r.json())
        .then((j: Data) => !stop && setData(j))
        .catch(() => undefined);
    void load();
    // Les détenteurs et la courbe changent : on relit toutes les 30 s
    const id = setInterval(() => !document.hidden && void load(), 30_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [mint, profile?.wallet]);

  const header = (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-pervenche">Chapitre 2</p>
      <h2 className="font-display text-2xl font-extrabold">Faire grandir ton mème</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Dix quêtes réelles, vérifiées toutes seules sur les données de ton mème. Chaque personnage du QG te guide. Pas de raccourci : ce sont les autres qui font vivre ton mème, et tes propres achats ne
        comptent jamais.
      </p>
    </div>
  );

  if (!data) return <section className="dash-panel h-40 animate-pulse" />;
  if (!data.signedIn) {
    return (
      <section className="dash-panel space-y-4 p-5">
        {header}
        <button type="button" onClick={() => void signIn()} className="btn-fete">
          Se connecter pour commencer
        </button>
      </section>
    );
  }

  const stats = data.stats!;
  const { list, done, next } = questsOf(stats);
  const current = data.tokens?.find((t) => t.mint === data.mint);
  return (
    <section className="dash-panel space-y-5 p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {header}
        <div className="text-right">
          <p className="font-display text-3xl font-extrabold tabular-nums">
            {done}/{QUESTS.length}
          </p>
          <p className="text-xs text-muted-foreground">quêtes réussies</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full rounded-full bg-gradient-to-r from-electrique via-pervenche to-[#e9a3c9] transition-[width] duration-700" style={{ width: `${(done / QUESTS.length) * 100}%` }} />
      </div>

      {data.tokens && data.tokens.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Choisir le mème">
          {data.tokens.map((t) => (
            <button key={t.mint} type="button" onClick={() => setMint(t.mint)} className={`chip shrink-0 gap-2 ${t.mint === data.mint ? "chip-active" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
              <img src={t.image_url} alt="" className="size-5 rounded-md object-cover" />${t.ticker}
            </button>
          ))}
        </div>
      )}
      {current && data.tokens?.length === 1 && (
        <p className="text-sm text-muted-foreground">
          Ton mème : <span className="font-bold text-foreground">{current.name}</span> <span className="font-mono text-pervenche">${current.ticker}</span>
        </p>
      )}

      <ol className="grid gap-3 lg:grid-cols-2">
        {list.map(({ q, state }, i) => {
          const m = QG_TEAM.find((x) => x.id === q.member);
          const isNext = q.id === next;
          return (
            <li key={q.id} className={`flex gap-3 rounded-2xl border p-3.5 ${state.done ? "border-achat/30 bg-achat/[0.06]" : isNext ? "border-pervenche/50 bg-white/[0.05]" : "border-white/[0.08] bg-white/[0.02]"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- personnage du QG */}
              <img src={memberImage(q.member)} alt={m?.nom ?? ""} className="h-16 w-12 shrink-0 object-contain" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="flex flex-wrap items-baseline gap-x-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Quête {i + 1}</span>
                  <span className={m?.color}>{m?.nom}</span>
                  {state.done && <span className="text-achat">✓ Réussie</span>}
                </p>
                <h3 className="font-extrabold leading-snug">{q.titre}</h3>
                <p className="text-sm text-muted-foreground">{q.conseil}</p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className={`h-full rounded-full ${state.done ? "bg-achat" : "bg-pervenche"}`} style={{ width: `${state.progress * 100}%` }} />
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{state.label}</span>
                </div>
                {!state.done && (
                  <Link href={q.action.href(data.mint ?? null)} className={`${isNext ? "btn-fete" : "btn-ghost"} mt-1 min-h-9 px-4 py-1.5 text-sm`}>
                    {q.action.label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        Les quêtes ne rapportent pas d&apos;argent : elles t&apos;aident à faire grandir ton mème dans les règles. Pas de promesse de gains, pas d&apos;achats organisés, pas de vraie personne visée.
      </p>
    </section>
  );
}
