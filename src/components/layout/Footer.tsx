import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { CLUSTER } from "@/lib/solana/config";
import { InstallApp } from "@/components/app/InstallApp";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ligne pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-md text-sm text-muted-foreground">Le launchpad et l&apos;appli de trading du peuple, sur Solana.</p>
          <InstallApp />
          <p className="max-w-xl text-xs text-muted-foreground/70">
            Les tokens créés sur Tiers-État sont des memecoins spéculatifs, pas une monnaie ayant cours légal. Vous pouvez tout perdre. Pas un conseil financier.
            {CLUSTER === "devnet" && " Réseau de test Solana (devnet) : les tokens n'ont aucune valeur réelle."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-muted-foreground sm:grid-cols-4 sm:self-end">
          <Link href="/demarrer" className="hover:text-foreground">
            Bien démarrer
          </Link>
          <a href="https://x.com/tiersetats" target="_blank" rel="noreferrer" className="hover:text-foreground">
            Donner mon avis
          </a>
          <Link href="/verifier" className="hover:text-foreground">
            Vérifier
          </Link>
          <Link href="/cgu" className="hover:text-foreground">
            CGU
          </Link>
          <Link href="/mentions-legales" className="hover:text-foreground">
            Mentions légales
          </Link>
        </div>
      </div>
    </footer>
  );
}
