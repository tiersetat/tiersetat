import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Manifeste — Tiers-État",
  description: "En 1789, le Tiers-État a réclamé sa place. En 2026, il reprend la main sur sa monnaie.",
};

const PILIERS: { n: string; titre: string; texte: string }[] = [
  {
    n: "I",
    titre: "Ton argent t'appartient",
    texte:
      "Une banque peut geler un compte, refuser un virement ou fermer ses guichets. Sur une blockchain, tu détiens toi-même tes clés : personne ne peut bouger tes fonds à ta place. C'est la promesse fondatrice de la crypto, née en 2009 au lendemain d'une crise bancaire.",
  },
  {
    n: "II",
    titre: "La vie privée est un droit",
    texte:
      "Payer sans que chaque achat soit observé, analysé, revendu. Des bâtisseurs comme Vitalik Buterin, cofondateur d'Ethereum, défendent l'idée qu'une monnaie libre doit aussi protéger la vie privée, dans le respect de la loi.",
  },
  {
    n: "III",
    titre: "Une monnaie stable pour payer",
    texte:
      "Les stablecoins, adossés à l'euro ou au dollar, circulent en quelques secondes, de jour comme de nuit, d'un bout à l'autre du monde, pour quelques centimes. Le paiement de demain ne dépend plus des horaires d'une banque.",
  },
  {
    n: "IV",
    titre: "Bitcoin, le symbole de la liberté",
    texte:
      "21 millions d'unités, jamais une de plus, sans banque centrale ni conseil d'administration. Que l'on en possède ou non, Bitcoin a prouvé qu'une monnaie pouvait exister sans permission.",
  },
  {
    n: "V",
    titre: "Le peuple frappe sa monnaie",
    texte:
      "Créer un token prenait des semaines et des développeurs. Ici, cela prend une minute, selon les mêmes règles pour tous, vérifiées sur la blockchain. Les mèmes français sont notre culture : ils méritent leur propre monnaie.",
  },
];

export default function ManifestePage() {
  return (
    <article className="mx-auto max-w-3xl space-y-12">
      <header className="space-y-4">
        <p className="font-mono text-sm text-pervenche">MANIFESTE</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Qu&apos;est-ce que le Tiers-État ? Tout.</h1>
        <p className="text-lg text-muted-foreground">
          En 1789, le Tiers-État représentait presque toute la nation, sans avoir son mot à dire. Aujourd&apos;hui, la monnaie est encore entre les
          mains de quelques institutions. La crypto rend au peuple le pouvoir de la créer, de la détenir et de l&apos;échanger librement.
        </p>
      </header>

      <ol className="space-y-5">
        {PILIERS.map((p) => (
          <li key={p.n} className="surface grid gap-4 p-6 sm:grid-cols-[3rem_1fr]">
            <p className="font-mono text-2xl text-pervenche">{p.n}</p>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{p.titre}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{p.texte}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="space-y-4 text-center">
        <p className="text-2xl font-semibold">Le peuple frappe sa monnaie.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/demarrer" className="btn-primary">
            Bien démarrer
          </Link>
          <Link href="/lancer" className="btn-ghost">
            Frapper un mème
          </Link>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Ce manifeste exprime une vision, pas un conseil en investissement. Les crypto-actifs sont volatils et tu peux perdre la totalité de ta mise.
        Renseigne-toi et n&apos;investis que ce que tu acceptes de perdre.
      </p>
    </article>
  );
}
