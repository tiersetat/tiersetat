import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { EmailLoginButton } from "@/components/providers/PrivyBridge";
import { CitizenButton } from "./CitizenButton";
import { WalletButton } from "./WalletButton";



/**
 * En-tête : sur téléphone et tablette, îlot flottant (logo + connexion) ;
 * sur ordinateur, le menu est dans la barre latérale et l'îlot ne garde que recherche et connexion, à droite.
 */
export function Header() {
  return (
    <header className="pointer-events-none sticky top-0 z-30 px-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] sm:px-4 sm:pt-3 lg:pl-[17rem]">
      <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-x-3 rounded-full border border-white/12 bg-[#12153a]/95 py-1.5 pr-1.5 pl-4 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.08)] lg:ml-auto lg:mr-0 lg:w-fit lg:pl-1.5">
        <Link href="/" aria-label="Tiers-État, accueil" className="shrink-0 whitespace-nowrap lg:hidden">
          <Wordmark />
        </Link>
        <div className="flex shrink-0 items-center justify-end gap-1.5">
          <Link href="/recherche" aria-label="Rechercher un token ou un compte" title="Rechercher" className="hidden h-10 items-center gap-2 rounded-full bg-white/[0.06] pr-4 pl-3 text-sm text-muted-foreground transition hover:bg-white/[0.08] hover:text-foreground lg:flex">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            Rechercher un mème, un créateur…
          </Link>
          <CitizenButton />
          <EmailLoginButton />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
