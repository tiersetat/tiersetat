import type { Metadata } from "next";
import Link from "next/link";
import { QgScene } from "@/components/qg/QgScene";
import { QgChapitre2 } from "@/components/qg/QgChapitre2";
import { QG_SCENE_READY, QG_TEAM } from "@/lib/qg-scene";

export const metadata: Metadata = { title: "Le QG — Tiers-État" };

export default function QgPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-soleil">Depuis 1789</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Le QG du Tiers-État</h1>
        <p className="max-w-2xl text-muted-foreground">
          Apprends à créer et à faire connaître ton token en jouant : chaque personnage t&apos;enseigne une étape. Clique sur celui qui a un point d&apos;exclamation, et fais glisser la salle pour t&apos;y promener.
        </p>
      </header>

      {QG_SCENE_READY ? (
        <QgScene />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QG_TEAM.map((m) => (
            <Link key={m.id} href={m.href} className="surface block space-y-2 p-5 transition hover:bg-white/[0.06]">
              <p className={`text-xs font-bold uppercase tracking-[0.2em] ${m.color}`}>{m.role}</p>
              <h2 className="font-display text-xl font-extrabold">{m.nom}</h2>
              <p className="text-sm text-muted-foreground">{m.pourquoi}</p>
            </Link>
          ))}
        </div>
      )}

      <QgChapitre2 />
    </div>
  );
}
