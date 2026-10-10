import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/Logo";
import { JoinWaitlist } from "@/components/waitlist/JoinWaitlist";
import { getWaitlistCount } from "@/lib/waitlist";

export const metadata: Metadata = {
  title: "Rejoindre le lancement — Tiers-État",
  description: "Le lancement officiel de Tiers-État arrive. Laisse ton e-mail : on te prévient du jour et de l'heure.",
};

export const revalidate = 30;

export default async function RejoindrePage() {
  const count = await getWaitlistCount().catch(() => null);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center space-y-6 py-10 text-center">
      <LogoMark size={96} className="drop-shadow-[0_0_40px_rgba(61,90,254,0.55)]" />
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-pervenche">Lancement officiel</p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Le peuple frappe sa monnaie. Bientôt pour de vrai.</h1>
      <p className="text-muted-foreground">
        Laisse ton e-mail : le jour du lancement, on te prévient de l&apos;heure exacte. En attendant, la bêta est ouverte et gratuite.
      </p>
      <JoinWaitlist initialCount={count} source="rejoindre" />
    </div>
  );
}
