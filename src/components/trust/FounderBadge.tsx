/** Statut de Fondateur (n°1 à 100). */
export function FounderBadge({ n }: { n: number }) {
  return (
    <span
      title="Parmi les 100 premiers à avoir créé ou échangé un mème sur Tiers-État"
      className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 text-xs font-semibold text-amber-200"
    >
      🏛 Fondateur n°{n}
    </span>
  );
}

/** Jauge publique des places de Fondateur. */
export function FounderGauge({ taken, seats }: { taken: number; seats: number }) {
  const pct = Math.min(100, (taken / seats) * 100);
  return (
    <div className="w-full max-w-md space-y-2 text-left">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-amber-200">🏛 Places de Fondateur</span>
        <span className="font-mono">
          {taken} / {seats}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {taken >= seats
          ? "Les 100 Fondateurs sont au complet."
          : `Les ${seats} premiers à créer ou échanger un mème deviennent Fondateurs, pour toujours. Encore ${seats - taken} place${seats - taken > 1 ? "s" : ""}.`}
      </p>
    </div>
  );
}
