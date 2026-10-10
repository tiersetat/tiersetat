import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { LaunchForm } from "@/components/launch/LaunchForm";

export const metadata: Metadata = { title: "Créer un token — Tiers-État" };

export default function LancerPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold">Frapper un mème</h1>
        <p className="text-muted-foreground">Un nom, un ticker, une image. Une seule signature, et ton token est en ligne.</p>
        <Link
          href="/ca-buzz"
          className="mt-2 flex items-center gap-3 rounded-2xl bg-vente/10 px-4 py-3 text-sm transition hover:bg-vente/15"
        >
          <span className="text-xl" aria-hidden>
            🔥
          </span>
          <span className="min-w-0 flex-1">
            <strong className="text-foreground">Pas d&apos;idée ?</strong> <span className="text-muted-foreground">Les sujets dont toute la France parle, prêts à devenir des mèmes.</span>
          </span>
          <span className="font-bold text-vente">→</span>
        </Link>
      </header>
      <Suspense>
        <LaunchForm />
      </Suspense>
    </div>
  );
}
