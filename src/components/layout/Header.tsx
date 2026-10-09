import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { EmailLoginButton } from "@/components/providers/PrivyBridge";
import { CitizenButton } from "./CitizenButton";
import { NavMore } from "./NavMore";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/", label: "Explorer" },
  { href: "/lancer", label: "Créer un token" },
  { href: "/ca-buzz", label: "Ça buzz" },
  { href: "/radar", label: "Radar" },
  { href: "/semaine", label: "Semaine" },
];
/** Pages secondaires, regroupées dans le menu « Plus » pour garder l'en-tête sur une ligne */
const MORE = [
  { href: "/classements", label: "Classements" },
  { href: "/clans", label: "Clans" },
  { href: "/cahiers", label: "Cahiers de doléances" },
  { href: "/portefeuille", label: "Portefeuille" },
  { href: "/dette", label: "La dette en direct" },
  { href: "/assemblee", label: "L'Assemblée" },
  { href: "/vision", label: "Vision" },
  { href: "/verifier", label: "Vérifier" },
]
// Sur téléphone, la navigation passe dans la barre d'onglets en bas (BottomTabBar)

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ligne bg-nuit/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-x-4 px-4 py-2.5 sm:gap-x-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" aria-label="Tiers-État, accueil" className="shrink-0 whitespace-nowrap">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-1 text-sm lg:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <NavMore items={MORE} />
          </nav>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <Link href="/recherche" aria-label="Rechercher un token ou un compte" title="Rechercher" className="hidden size-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-white/5 hover:text-foreground lg:grid">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          <CitizenButton />
          <EmailLoginButton />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
