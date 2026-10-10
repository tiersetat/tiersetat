import type { Metadata } from "next";
import { VerifyOnChain } from "@/components/verify/VerifyOnChain";
import secours from "@/lib/secours.json";
import { VerifySnapshots } from "@/components/verify/VerifySnapshots";
import { gatewayPrefix } from "@/lib/ipfs";
import { getSealedSnapshots } from "@/lib/snapshot-data";
import { DBC_CONFIG, DBC_PROGRAM_ID, explorerUrl, TREASURY_WALLET } from "@/lib/solana/config";

export const metadata: Metadata = {
  title: "Fiabilité — Tiers-État",
  description: "Les règles de Tiers-État relues en direct sur la blockchain Solana : frais, offre fixe, liquidité bloquée, trésorerie.",
};

/** Programme DAMM v2 de Meteora (marché d'échange après la migration). */
export const revalidate = 120;

const DAMM_V2_PROGRAM = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG";
/** Mème de test qui a pris la Bastille sur le devnet (marché DAMM v2 créé). */
const BASTILLE_TEST_POOL = "2hHbSBo4ggP595qnjNnu2teVhb9FLxYcXD1bttujwjpP";

const CODE_SOURCE = "https://github.com/tiersetat/tiersetat";

const ADRESSES = [
  { label: "Programme de la courbe (Meteora)", detail: "Le code qui crée les tokens et exécute chaque échange", address: DBC_PROGRAM_ID.toBase58() },
  { label: "Configuration Tiers-État", detail: "Les règles communes à tous les mèmes, inscrites une fois pour toutes", address: DBC_CONFIG?.toBase58() },
  { label: "Trésorerie : coffre multi-signature", detail: "Reçoit la part des frais de la plateforme ; toute dépense exige 2 signatures sur 3", address: TREASURY_WALLET?.toBase58() },
  { label: "Règles du coffre (Squads)", detail: "Les 3 signataires et le seuil de 2 signatures, inscrits sur la blockchain", address: process.env.NEXT_PUBLIC_TREASURY_MULTISIG },
  { label: "Programme du marché après migration (Meteora)", detail: "Là où un mème part quand il prend la Bastille", address: DAMM_V2_PROGRAM },
  { label: "Exemple : migration testée", detail: "Marché créé par notre test de bout en bout, liquidité bloquée", address: BASTILLE_TEST_POOL },
];

const CENTRALISE = [
  ["La trésorerie", "Coffre multi-signature 2 sur 3 (réseau de test)", "Signataires indépendants (clé matérielle, personne de confiance) au lancement"],
  ["Le site", "Hébergé chez un prestataire, avec une interface de secours indépendante", "Adresse décentralisée et hébergement IPFS permanent"],
  ["Le code du site", "Public sur GitHub", "Vérification que le site en ligne correspond au code publié"],
  ["Profils, points, commentaires", "Base de données de Tiers-État", "Ancrage progressif sur la blockchain"],
  ["Les décisions", "L'équipe ; l'Assemblée est en répétition sur le réseau de test", "L'Assemblée : vote des détenteurs de $TIERS"],
];

export default async function VerifierPage() {
  const snapshots = await getSealedSnapshots().catch(() => []);
  let prefix = "";
  try {
    prefix = gatewayPrefix();
  } catch {
    /* passerelle Pinata non configurée : passerelles publiques seulement */
  }
  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <header className="space-y-3">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-achat">🛡 Fiabilité</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Pourquoi tu peux faire confiance à Tiers-État</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Ne nous crois pas sur parole : chaque règle est inscrite sur la blockchain Solana, et cette page la relit en direct, depuis ton navigateur, sans passer par nos serveurs.
        </p>
      </header>

      {/* Les 3 garanties */}
      <section className="grid gap-3 md:grid-cols-3">
        {[
          { t: "Ton argent reste à toi", d: "Tes fonds sont dans ton wallet, jamais chez nous. Personne chez Tiers-État ne peut les bouger ni les bloquer.", c: "text-achat" },
          { t: "Liquidité bloquée à vie", d: "Quand un mème prend la Bastille, 100 % de sa liquidité est verrouillée pour toujours. Impossible de la retirer, même pour nous.", c: "text-soleil" },
          { t: "Règles gravées, mêmes pour tous", d: "Frais, offre, part du créateur : inscrits une fois pour toutes. Aucun nom ni aucune image ne peut être changé après coup.", c: "text-ciel" },
        ].map((g) => (
          <div key={g.t} className="rounded-3xl bg-surface p-5 ring-1 ring-white/[0.08]">
            <p className={`text-lg font-extrabold ${g.c}`}>✓ {g.t}</p>
            <p className="mt-2 text-sm text-muted-foreground">{g.d}</p>
          </div>
        ))}
      </section>

      {/* Audits */}
      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Un programme audité par des experts en sécurité</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Les mèmes de Tiers-État sont créés et échangés par le programme « Dynamic Bonding Curve » de Meteora, l&apos;un des plus utilisés de Solana. Son code a été
          examiné par plusieurs cabinets de sécurité indépendants.
        </p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {[
            { n: "Code4rena", d: "Concours d'audit public, 2025 : aucune faille grave", u: "https://code4rena.com/reports/2025-08-meteora-dynamic-bonding-curve" },
            { n: "OtterSec", d: "Audit de sécurité 2025", u: "https://docs.meteora.ag/resources/audits" },
            { n: "Sec3", d: "Audit de sécurité 2025", u: "https://docs.meteora.ag/resources/audits" },
          ].map((a) => (
            <li key={a.n}>
              <a href={a.u} target="_blank" rel="noreferrer" className="block rounded-2xl bg-surface p-4 ring-1 ring-white/[0.08] transition hover:ring-white/20">
                <p className="font-extrabold">{a.n} ↗</p>
                <p className="text-xs text-muted-foreground">{a.d}</p>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Anti-fraude */}
      <section className="rounded-3xl bg-surface p-5 ring-1 ring-white/[0.08]">
        <h2 className="text-xl font-extrabold">Ce qu&apos;on fait contre les arnaques</h2>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li>✓ Un <strong className="text-foreground">Bouclier noté sur 100</strong> sur chaque mème : créateur, concentration, mint, gel.</li>
          <li>✓ Un badge public dès qu&apos;un <strong className="text-foreground">créateur revend</strong> ses tokens.</li>
          <li>✓ Des <strong className="text-foreground">frais anti-robots</strong> au lancement, pour un départ équitable.</li>
          <li>✓ Les <strong className="text-foreground">faux volumes filtrés</strong> : on ne compte que les vrais échanges.</li>
          <li>✓ Un <strong className="text-foreground">code public</strong> et un <strong className="text-foreground">coffre à plusieurs signatures</strong> pour la trésorerie.</li>
          <li>✓ Un avertissement clair avant chaque achat risqué.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold">Les règles, relues en direct sur la blockchain</h2>
        <VerifyOnChain />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Toutes les adresses</h2>
        <p className="text-sm text-muted-foreground">Ouvre-les dans l&apos;explorateur Solana pour voir chaque transaction, sans intermédiaire.</p>
        <ul className="surface divide-y divide-ligne">
          {ADRESSES.filter((a) => a.address).map((a) => (
            <li key={a.label} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </div>
              <a href={explorerUrl("address", a.address!)} target="_blank" rel="noreferrer" className="chip font-mono">
                {a.address!.slice(0, 6)}…{a.address!.slice(-6)} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Les preuves des points</h2>
        <p className="text-sm text-muted-foreground">
          Chaque instantané des Cahiers de doléances est publié sur IPFS et son empreinte est scellée sur la blockchain. Personne, pas même
          nous, ne peut réécrire l&apos;historique des points. Connecte ton wallet pour vérifier les tiens.
        </p>
        <VerifySnapshots snapshots={snapshots} gatewayPrefix={prefix} />
      </section>

      <section className="surface space-y-3 p-6">
        <h2 className="text-2xl font-semibold">Si ce site tombe</h2>
        <p className="text-sm text-muted-foreground">
          Une interface de secours, hébergée hors de notre infrastructure, lit les mèmes directement sur la blockchain et permet de les échanger
          avec ton propre wallet. Elle ne dépend ni de nos serveurs ni de notre base de données.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href={secours.pages} target="_blank" rel="noreferrer" className="btn-primary">
            Ouvrir l&apos;interface de secours
          </a>
          <a href={`https://${secours.cid}.ipfs.dweb.link/`} target="_blank" rel="noreferrer" className="btn-ghost">
            Version IPFS
          </a>
        </div>
        <p className="break-all font-mono text-xs text-muted-foreground">IPFS : {secours.cid}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Ce qui est encore centralisé</h2>
        <p className="text-sm text-muted-foreground">
          Tes fonds et tes tokens ne dépendent déjà que de la blockchain. Voici, en toute honnêteté, ce qui dépend encore de nous, et comment ça
          va changer.
        </p>
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Élément</th>
                <th className="px-2 py-3 font-medium">Aujourd&apos;hui</th>
                <th className="px-4 py-3 font-medium">Prochaine étape</th>
              </tr>
            </thead>
            <tbody>
              {CENTRALISE.map(([el, now, next]) => (
                <tr key={el} className="border-t border-ligne">
                  <td className="px-4 py-3 font-medium">{el}</td>
                  <td className="px-2 py-3 text-muted-foreground">{now}</td>
                  <td className="px-4 py-3">{next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm">
          <a href={CODE_SOURCE} target="_blank" rel="noreferrer" className="mr-6 underline underline-offset-4 hover:text-foreground">
            Lire le code source sur GitHub
          </a>
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Bêta sur le réseau de test de Solana (devnet) : les adresses et les montants concernent ce réseau. Les programmes de la courbe et du
        marché sont développés et opérés par Meteora.
      </p>
    </div>
  );
}
