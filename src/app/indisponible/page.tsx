import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export const metadata: Metadata = { title: "Indisponible dans ton pays — Tiers-État", robots: { index: false } };

export default function IndisponiblePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center space-y-5 py-16 text-center">
      <LogoMark size={72} />
      <h1 className="text-3xl font-bold tracking-tight">Tiers-État n&apos;est pas disponible dans ton pays</h1>
      <p className="text-muted-foreground">
        Pour respecter les sanctions internationales et les lois applicables, l&apos;accès à Tiers-État est restreint depuis certains pays et
        régions. Contourner cette restriction (VPN, par exemple) est contraire à nos conditions d&apos;utilisation.
      </p>
      <Link href="/cgu" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Conditions d&apos;utilisation
      </Link>
    </div>
  );
}
