/** Champ de recherche unique : mèmes Tiers-État, tous les tokens Solana (nom, $TICKER ou adresse) et traders. */
export function SearchBox() {
  return (
    <form action="/recherche" role="search" className="relative">
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input id="market-search" name="q" className="field rounded-full py-3.5 pl-12" placeholder="Rechercher un token, un $TICKER, une adresse, un trader…" aria-label="Rechercher" autoComplete="off" />
    </form>
  );
}
