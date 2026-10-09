import type { Metadata } from "next";
import Link from "next/link";
import { DebtCounter } from "@/components/dette/DebtCounter";
import { DETTE } from "@/lib/dette";
import { getOfficialDette } from "@/lib/dette-token";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "La dette en direct — Tiers-État",
  description: "La dette publique française grimpe de 8 600 € par seconde. Pendant ce temps, le peuple frappe sa monnaie.",
};

const HISTOIRE: [string, string][] = [
  ["1788", "Le Trésor royal est à sec : la moitié des dépenses de l'État sert à payer les intérêts de la dette."],
  ["1789", "Pour trouver de l'argent, le roi convoque les États généraux. Le Tiers-État se proclame Assemblée nationale. On connaît la suite."],
  ["1790", "Les assignats, monnaie de papier imprimée pour éponger la dette, perdent plus de 95 % de leur valeur en six ans."],
  ["2026", `${(DETTE.baseEur / 1e9).toLocaleString("fr-FR")} milliards d'euros. ${DETTE.ratioPib} % du PIB. Record battu, trimestre après trimestre.`],
];


export default async function DettePage() {
  const officiel = await getOfficialDette().catch(() => null);
  return (
    <div className="mx-auto max-w-4xl space-y-16">
      <header className="space-y-6">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-vente">La dette en direct</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          La France coule.
          <br />
          <span className="text-lueur-gradient">Le peuple frappe sa monnaie.</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Voici, à la seconde près, ce que doit l&apos;État français. Ne cherche pas le bouton pour l&apos;arrêter : il n&apos;existe pas.
        </p>
      </header>

      <DebtCounter />

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">L&apos;histoire bégaie</h2>
        <ol className="space-y-4">
          {HISTOIRE.map(([annee, texte]) => (
            <li key={annee} className="grid gap-2 sm:grid-cols-[6rem_1fr]">
              <p className={`font-mono text-2xl ${annee === "2026" ? "text-vente" : "text-pervenche"}`}>{annee}</p>
              <p className="text-muted-foreground">{texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="surface flex flex-wrap items-center justify-between gap-6 p-8">
        <div className="max-w-lg space-y-2">
          <h2 className="text-2xl font-semibold">Eux impriment de la dette. Toi, frappe un mème.</h2>
          <p className="text-sm text-muted-foreground">Même règle pour tous, offre fixe, liquidité bloquée. Rien à voir avec un budget de l&apos;État.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {officiel ? (
            <Link href={`/token/${officiel.mint}`} className="btn-primary">
              Acheter $DETTE
            </Link>
          ) : (
            <span className="btn-primary pointer-events-none opacity-60">$DETTE arrive bientôt</span>
          )}
          <Link href="/manifeste" className="btn-ghost">
            Lire le manifeste
          </Link>
        </div>
      </section>

      <footer className="space-y-1 text-xs text-muted-foreground/80">
        <p>
          Estimation : dernier chiffre officiel ({DETTE.source}) prolongé au rythme moyen observé au premier semestre 2026. Le chiffre réel
          n&apos;est publié qu&apos;une fois par trimestre.
        </p>
        <p>Page satirique, sans lien avec l&apos;État, l&apos;INSEE ou le ministère de l&apos;Économie. Pas un conseil financier.</p>
      </footer>
    </div>
  );
}
