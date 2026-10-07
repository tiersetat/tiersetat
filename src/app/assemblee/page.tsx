import type { Metadata } from "next";
import Link from "next/link";
import { AssembleeLive } from "@/components/assemblee/AssembleeLive";

export const metadata: Metadata = {
  title: "L'Assemblée — Tiers-État",
  description: "L'organisation de vote de Tiers-État, sur la blockchain : chaque détenteur de voix propose et vote, le Trésor n'obéit qu'aux votes.",
};

export default function AssembleePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-pervenche">Gouvernance · répétition générale</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">L&apos;Assemblée</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          En 1789, le Tiers-État s&apos;est proclamé Assemblée nationale. Ici, l&apos;Assemblée vit sur la blockchain : chaque voix compte, les
          règles sont publiques, et son Trésor n&apos;obéit qu&apos;aux votes. Personne ne la contrôle, pas même nous.
        </p>
      </header>

      <AssembleeLive />

      <section className="surface space-y-2 p-6 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">Ce qu&apos;il faut savoir</h2>
        <p>
          Sur le réseau de test, l&apos;Assemblée fonctionne avec un jeton de vote d&apos;essai, qui préfigure $TIERS. Au lancement, les voix seront
          distribuées en priorité à la communauté, d&apos;après les points des Cahiers de doléances scellés sur la blockchain.
        </p>
        <p>
          Voir aussi :{" "}
          <Link href="/vision" className="underline underline-offset-2">
            la Vision
          </Link>{" "}
          et{" "}
          <Link href="/verifier" className="underline underline-offset-2">
            Vérifie par toi-même
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
