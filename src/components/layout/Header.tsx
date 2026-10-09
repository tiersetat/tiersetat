import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { EmailLoginButton } from "@/components/providers/PrivyBridge";
import { CitizenButton } from "./CitizenButton";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/", label: "Explorer" },
  { href: "/lancer", label: "Créer un token" },
  { href: "/ca-buzz", label: "Ça buzz" },
  { href: "/radar", label: "Radar" },
  { href: "/classements", label: "Classements" },
  { href: "/clans", label: "Clans" },
  { href: "/cahiers", label: "Cahiers" },
  { href: "/dette", label: "La dette" },
  { href: "/vision", label: "Vision" },
];
// Sur téléphone, la navigation passe dans la barre d'onglets en bas (BottomTabBar)

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ligne bg-nuit/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:gap-x-6 sm:py-3">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Tiers-État, accueil">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:flex-wrap sm:gap-2">
          <form action="/recherche" role="search" className="hidden lg:block">
            <input name="q" placeholder="Rechercher…" aria-label="Rechercher un token ou un compte" className="field h-10 w-44 py-0 transition-[width] focus:w-60" />
          </form>
          <CitizenButton />
          <EmailLoginButton />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
