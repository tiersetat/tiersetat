import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { CLUSTER } from "@/lib/solana/config";
import { InstallApp } from "@/components/app/InstallApp";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ligne">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-md text-sm text-muted-foreground">Le peuple frappe sa monnaie. Le launchpad des mèmes français, sur Solana.</p>
          <InstallApp />
          <p className="max-w-xl text-xs text-muted-foreground/70">
            Les tokens créés sur Tiers-État sont des memecoins spéculatifs, pas une monnaie ayant cours légal. Vous pouvez tout perdre. Pas un conseil financier.
            {CLUSTER === "devnet" && " Réseau de test Solana (devnet) : les tokens n'ont aucune valeur réelle."}
          </p>
        </div>
        <div className="flex gap-5 text-sm text-muted-foreground sm:items-end">
          <Link href="/vision" className="hover:text-foreground">
            Vision
          </Link>
          <Link href="/manifeste" className="hover:text-foreground">
            Manifeste
          </Link>
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
