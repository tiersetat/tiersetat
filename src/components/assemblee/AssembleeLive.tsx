"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import assemblee from "@/lib/assemblee.json";
import { CLUSTER, explorerUrl } from "@/lib/solana/config";

const PROGRAM = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");
const ETATS = ["Brouillon", "En signature", "Vote en cours", "Adoptée", "En exécution", "Terminée", "Annulée", "Rejetée", "Exécutée avec erreurs", "Bloquée"];

type Prop = { address: string; name: string; link: string; state: number; yes: number; no: number; endsAt: number | null };
type Data = { name: string; supply: number; thresholdPct: number; votingDays: number; treasurySol: number; proposals: Prop[] };

const voix = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
const realmsUrl = (path = "") => `https://app.realms.today/dao/${assemblee.realm}${path}?cluster=${CLUSTER}`;

/** L'Assemblée lue directement sur la blockchain (SPL Governance), depuis le navigateur du visiteur. */
export function AssembleeLive() {
  const { connection } = useConnection();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const gov = await import("@solana/spl-governance");
      const { getMint } = await import("@solana/spl-token");
      const realm = await gov.getRealm(connection, new PublicKey(assemblee.realm));
      const governance = await gov.getGovernance(connection, new PublicKey(assemblee.governance));
      const mint = await getMint(connection, new PublicKey(assemblee.mint));
      const scale = 10 ** mint.decimals;
      const proposals = await gov.getProposalsByGovernance(connection, PROGRAM, new PublicKey(assemblee.governance));
      const cfg = governance.account.config;
      const data: Data = {
        name: realm.account.name,
        supply: Number(mint.supply) / scale,
        thresholdPct: cfg.communityVoteThreshold.value ?? 0,
        votingDays: cfg.baseVotingTime / 86_400,
        treasurySol: (await connection.getBalance(new PublicKey(assemblee.treasury))) / 1e9,
        proposals: proposals
          .map((p) => ({
            address: p.pubkey.toBase58(),
            name: p.account.name,
            link: p.account.descriptionLink,
            state: p.account.state,
            yes: Number(p.account.options[0]?.voteWeight?.toString() ?? 0) / scale,
            no: Number(p.account.denyVoteWeight?.toString() ?? 0) / scale,
            endsAt: p.account.votingAt ? (Number(p.account.votingAt.toString()) + cfg.baseVotingTime) * 1000 : null,
          }))
          .sort((a, b) => (b.endsAt ?? 0) - (a.endsAt ?? 0)),
      };
      if (!cancelled) setData(data);
    })().catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [connection]);

  if (error) return <p className="surface p-6 text-sm text-muted-foreground">Lecture de l&apos;Assemblée impossible pour le moment. Réessaie dans un instant.</p>;
  if (!data) return <div className="surface h-72 animate-pulse" />;

  return (
    <div className="space-y-8">
      <dl className="grid gap-3 sm:grid-cols-4">
        {[
          ["Voix en circulation", voix(data.supply)],
          ["Majorité requise", `${data.thresholdPct} %`],
          ["Durée d'un vote", `${data.votingDays.toLocaleString("fr-FR")} jours`],
          ["Trésor de l'Assemblée", `${data.treasurySol.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} SOL`],
        ].map(([label, value]) => (
          <div key={label} className="surface p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-mono text-lg">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Les propositions</h2>
        {data.proposals.length === 0 ? (
          <p className="surface p-6 text-sm text-muted-foreground">Aucune proposition pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-3">
            {data.proposals.map((p) => {
              const yesPct = data.supply ? (p.yes / data.supply) * 100 : 0;
              const noPct = data.supply ? (p.no / data.supply) * 100 : 0;
              const open = p.state === 2;
              return (
                <li key={p.address} className="surface space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline underline-offset-2">
                          Lire le texte soumis au vote
                        </a>
                      )}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${open ? "bg-amber-400/15 text-amber-300" : p.state === 3 || p.state === 5 ? "bg-achat/15 text-achat" : "bg-white/5 text-muted-foreground"}`}>
                      {ETATS[p.state] ?? "Inconnu"}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="bg-achat" style={{ width: `${Math.min(100, yesPct)}%` }} />
                      <div className="bg-vente" style={{ width: `${Math.min(100, noPct)}%` }} />
                    </div>
                    <p className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        <span className="text-achat">Pour {voix(p.yes)}</span> ({yesPct.toFixed(1)} %) · <span className="text-vente">Contre {voix(p.no)}</span> · adoption à{" "}
                        {data.thresholdPct} % des voix
                      </span>
                      {open && p.endsAt && <span>Fin du vote le {new Date(p.endsAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" })}</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {open && (
                      <a href={realmsUrl(`/proposal/${p.address}`)} target="_blank" rel="noreferrer" className="btn-primary px-3 py-1.5 text-xs">
                        Voter
                      </a>
                    )}
                    <a href={explorerUrl("address", p.address)} target="_blank" rel="noreferrer" className="chip">
                      Sur la blockchain ↗
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        {data.name} · lu à l&apos;instant sur la blockchain. Le vote se fait sur Realms, l&apos;interface de gouvernance standard de Solana :{" "}
        <a href={realmsUrl()} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          ouvrir l&apos;Assemblée sur Realms
        </a>
        .
      </p>
    </div>
  );
}
