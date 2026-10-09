import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-5 py-20 text-center">
      <LogoMark size={72} className="opacity-80" />
      <h1 className="text-3xl font-bold tracking-tight">Page introuvable</h1>
      <p className="max-w-md text-muted-foreground">Ce token, ce profil ou cette page n&apos;existe pas (ou plus).</p>
      <Link href="/" className="btn-primary">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
