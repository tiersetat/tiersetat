/** Affiché instantanément pendant le chargement d'une page : le changement d'onglet paraît immédiat. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse space-y-4" aria-busy="true" aria-label="Chargement">
      <div className="h-10 w-2/5 rounded-2xl bg-white/[0.08]" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-9 w-20 rounded-full bg-white/[0.07]" />
        ))}
      </div>
      <div className="space-y-2 rounded-3xl border border-white/10 bg-white/[0.04] p-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="size-11 rounded-2xl bg-white/[0.08]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-white/[0.08]" />
              <div className="h-3 w-1/4 rounded bg-white/[0.06]" />
            </div>
            <div className="h-7 w-20 rounded-xl bg-white/[0.07]" />
          </div>
        ))}
      </div>
    </div>
  );
}
