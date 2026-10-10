import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { EmailLoginButton } from "@/components/providers/PrivyBridge";
import { CitizenButton } from "./CitizenButton";
import { WalletButton } from "./WalletButton";

/**
 * Barre du haut façon iOS : pleine largeur, collée en haut, fine ligne de séparation.
 * Logo Tiers-État à gauche, recherche au centre, connexion à droite.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-nuit/95 pt-[env(safe-area-inset-top)] lg:pl-64">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:h-14 sm:flex-nowrap sm:py-0">
        <Link href="/" aria-label="Tiers-État, accueil" className="shrink-0 whitespace-nowrap lg:hidden">
          <Wordmark />
        </Link>
        <form action="/recherche" role="search" className="relative order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 lg:max-w-md">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="header-search"
            name="q"
            placeholder="Rechercher"
            aria-label="Rechercher un token, un $TICKER, une adresse ou un trader"
            autoComplete="off"
            className="h-9 w-full rounded-xl bg-white/[0.08] pr-3 pl-9 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-electrique/50"
          />
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <CitizenButton />
          <EmailLoginButton />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
