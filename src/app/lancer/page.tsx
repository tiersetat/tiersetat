import { Suspense } from "react";
import type { Metadata } from "next";
import { LaunchForm } from "@/components/launch/LaunchForm";

export const metadata: Metadata = { title: "Créer un token — Tiers-État" };

export default function LancerPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Créer un token</h1>
        <p className="text-muted-foreground">Un nom, un ticker, une image. Une seule signature, et ton token est en ligne.</p>
      </header>
      <Suspense>
        <LaunchForm />
      </Suspense>
    </div>
  );
}
