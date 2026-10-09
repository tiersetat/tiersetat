import type { Metadata } from "next";
import Link from "next/link";
import { MyAddress } from "@/components/onboarding/MyAddress";
import { InstallApp } from "@/components/app/InstallApp";
import { CLUSTER } from "@/lib/solana/config";

export const metadata: Metadata = {
  title: "Bien démarrer — Tiers-État",
  description: "Créer son compte, obtenir des SOL de test et lancer son premier token sur Tiers-État, en 3 minutes.",
};

const devnet = CLUSTER === "devnet";

const GARANTIES: [string, string][] = [
  ["Liquidité bloquée pour toujours", "Personne, pas même le créateur, ne peut retirer l'argent du pool."],
  ["Offre fixe", "1 milliard de tokens, émis par le programme Meteora : le créateur ne peut pas en créer en plus."],
  ["Créateur authentifié", "Le mème est rattaché au compte qui l'a réellement frappé."],
  ["Contenu modéré", "Nom et description sont filtrés, chacun peut signaler un abus et nos modérateurs peuvent masquer un token."],
];

export default function DemarrerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Bien démarrer</h1>
        <p className="text-lg text-muted-foreground">Trois minutes pour créer ton compte, obtenir des SOL et lancer ton premier token.</p>
        <InstallApp />
        {devnet && (
          <p className="rounded-xl border border-pervenche/30 bg-pervenche/10 p-4 text-sm">
            Tiers-État tourne sur le <strong>réseau de test de Solana (devnet)</strong> : tout fonctionne comme en vrai, mais les SOL et les tokens
            sont <strong>fictifs</strong> et gratuits. Tu peux tout essayer sans risquer un centime.
          </p>
        )}
      </header>

      <ol className="space-y-6">
        <li className="surface space-y-3 p-6">
          <p className="font-mono text-sm text-pervenche">01</p>
          <h2 className="text-xl font-semibold">Crée ton compte</h2>
          <p className="text-sm text-muted-foreground">Deux possibilités, au choix :</p>
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Avec ton e-mail</strong> (le plus simple) : clique sur « Continuer avec un e-mail » en haut de la page. Un wallet Solana sécurisé
              est créé pour toi, sans phrase secrète à retenir.
            </li>
            <li>
              <strong>Avec un wallet Solana</strong> (Phantom ou Solflare) : clique sur « Connecter un wallet »
              {devnet && ", après avoir réglé ton wallet sur le réseau Devnet (Paramètres → Paramètres du développeur → mode Testnet → Devnet)"}.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Clique ensuite sur « Se connecter » : une signature gratuite ouvre ta session.</p>
        </li>

        <li className="surface space-y-3 p-6">
          <p className="font-mono text-sm text-pervenche">02</p>
          <h2 className="text-xl font-semibold">{devnet ? "Obtiens des SOL de test (gratuits)" : "Alimente ton wallet"}</h2>
          {devnet ? (
            <>
              <p className="text-sm text-muted-foreground">Copie ton adresse ci-dessous, puis colle-la sur le faucet officiel de Solana en choisissant « Devnet ».</p>
              <MyAddress />
              <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="btn-primary inline-flex">
                Ouvrir le faucet Solana ↗
              </a>
              <p className="text-xs text-muted-foreground">Le faucet peut demander une connexion GitHub et limite le nombre de demandes : 1 à 2 SOL suffisent largement pour tester.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Envoie des SOL vers ton adresse depuis une plateforme d&apos;échange ou un autre wallet.</p>
              <MyAddress />
            </>
          )}
        </li>

        <li className="surface space-y-3 p-6">
          <p className="font-mono text-sm text-pervenche">03</p>
          <h2 className="text-xl font-semibold">Lance-toi</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/lancer" className="rounded-xl border border-ligne p-4 text-sm hover:border-white/20 hover:bg-white/[0.03]">
              <p className="font-medium">Créer un token</p>
              <p className="mt-1 text-muted-foreground">Un nom, un ticker, une image, une signature.</p>
            </Link>
            <Link href="/ca-buzz" className="rounded-xl border border-ligne p-4 text-sm hover:border-white/20 hover:bg-white/[0.03]">
              <p className="font-medium">Ça buzz</p>
              <p className="mt-1 text-muted-foreground">Transforme l&apos;actu du jour en token.</p>
            </Link>
            <Link href="/clans" className="rounded-xl border border-ligne p-4 text-sm hover:border-white/20 hover:bg-white/[0.03]">
              <p className="font-medium">Rejoins un clan</p>
              <p className="mt-1 text-muted-foreground">Fais grimper ta région au classement.</p>
            </Link>
          </div>
        </li>
      </ol>

      <section className="surface space-y-4 p-6">
        <h2 className="text-xl font-semibold">Chaque mème est vérifié</h2>
        <p className="text-sm text-muted-foreground">
          Un token n&apos;apparaît sur Tiers-État que s&apos;il a été frappé ici, selon les mêmes règles pour tout le monde. Avant de l&apos;afficher, nos
          serveurs relisent tout directement sur la blockchain.
        </p>
        <ul className="grid gap-3 text-sm sm:grid-cols-2">
          {GARANTIES.map(([titre, texte]) => (
            <li key={titre} className="rounded-xl border border-ligne p-4">
              <p className="font-medium">{titre}</p>
              <p className="mt-1 text-muted-foreground">{texte}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Ces règles empêchent les arnaques techniques, pas la spéculation : un créateur peut acheter tôt et revendre. Un memecoin reste très risqué,
          n&apos;y mets que ce que tu acceptes de perdre.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Questions fréquentes</h2>
        {[
          ["C'est quoi une bonding curve ?", "Le prix d'un token suit une courbe publique : il monte quand on achète, descend quand on vend. Tout le monde achète au même prix, sans prévente. Quand la courbe est remplie, le token migre sur un DEX avec une liquidité verrouillée."],
          ["Est-ce que je peux perdre de l'argent ?", devnet ? "Pas ici : sur le réseau de test, les SOL sont fictifs. Mais en conditions réelles, un memecoin est très spéculatif : son prix peut tomber à zéro." : "Oui. Un memecoin est très spéculatif : son prix peut tomber à zéro. N'engage que ce que tu es prêt à perdre."],
          ["Qui peut retirer la liquidité ?", "Personne. Pendant la courbe, les SOL sont dans le pool, puis la liquidité est verrouillée à vie sur le DEX. Le panneau « Transparence » de chaque token le vérifie sur la blockchain."],
          ["Combien gagne un créateur ?", "Le créateur touche 70 % des frais de trading de son token (après la part du protocole Meteora), qu'il encaisse depuis son profil."],
        ].map(([q, a]) => (
          <details key={q} className="surface group p-5">
            <summary className="cursor-pointer font-medium marker:text-pervenche">{q}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
