"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";

/** Rejoindre / quitter un clan. `currentClan` est lu côté serveur pour l'utilisateur connecté. */
export function JoinClanButton({ slug, currentClan }: { slug: string; currentClan: string | null }) {
  const router = useRouter();
  const { profile, signIn } = useSession();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const member = currentClan === slug;

  function submit() {
    if (!profile) return void signIn();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/clan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clan: member ? null : slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setError(json.error ?? "Action impossible");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={submit} disabled={pending} className={member ? "btn-ghost" : "btn-primary"}>
        {!profile ? "Se connecter pour rejoindre" : member ? "Membre ✓ · Quitter" : currentClan ? "Changer pour ce clan" : "Rejoindre ce clan"}
      </button>
      {error && <p className="text-xs text-vente">{error}</p>}
    </div>
  );
}
