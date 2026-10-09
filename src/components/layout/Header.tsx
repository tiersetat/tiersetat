import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { EmailLoginButton } from "@/components/providers/PrivyBridge";
import { CitizenButton } from "./CitizenButton";
import { HeaderNav } from "./HeaderNav";
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

/** En-tête en îlot flottant : une pilule de verre détachée des bords, au-dessus de la page. */
export function Header() {
  return (
    <header className="pointer-events-none sticky top-0 z-40 px-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] sm:px-4 sm:pt-3">
      <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-x-3 rounded-full border border-white/10 bg-nuit/65 py-1.5 pr-1.5 pl-4 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.8),0_0_0_1px_rgb(140_147_201/0.08),inset_0_1px_0_rgb(255_255_255/0.07)] backdrop-blur-2xl sm:gap-x-5">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" aria-label="Tiers-État, accueil" className="shrink-0 whitespace-nowrap">
            <Wordmark />
          </Link>
          <HeaderNav items={NAV} more={MORE} />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5">
          <Link href="/recherche" aria-label="Rechercher un token ou un compte" title="Rechercher" className="hidden size-10 place-items-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground lg:grid">
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
