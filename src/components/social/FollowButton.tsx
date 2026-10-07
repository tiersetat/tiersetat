"use client";

import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";

/** Suivre / ne plus suivre un compte (mise à jour optimiste du compteur). */
export function FollowButton({ wallet, initialFollowing, initialFollowers }: { wallet: string; initialFollowing: boolean; initialFollowers: number }) {
  const { profile, signIn } = useSession();
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = (
    <span className="text-sm text-muted-foreground" aria-live="polite">
      <span className="font-mono text-foreground">{followers}</span> abonné{followers > 1 ? "s" : ""}
    </span>
  );
  if (profile?.wallet === wallet) return count;

  async function toggle() {
    if (!profile) return void signIn();
    setBusy(true);
    setError(null);
    const next = !following;
    setFollowing(next);
    setFollowers((n) => n + (next ? 1 : -1));
    try {
      const res = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Action impossible");
      setFollowing(json.following);
      setFollowers(json.followers);
    } catch (e) {
      setFollowing(!next);
      setFollowers((n) => n + (next ? -1 : 1));
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void toggle()} disabled={busy} className={following ? "btn-ghost" : "btn-primary"}>
        {!profile ? "Se connecter pour suivre" : following ? "Abonné ✓" : "Suivre"}
      </button>
      {count}
      {error && <p className="w-full text-xs text-vente">{error}</p>}
    </div>
  );
}
