import Link from "next/link";
import type { Holder } from "@/lib/holders";
import { explorerUrl } from "@/lib/solana/config";

const LABEL: Record<Holder["kind"], string> = { courbe: "Courbe (en vente)", marche: "Marché (liquidité bloquée)", createur: "Créateur", utilisateur: "" };
const pct = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: n < 1 ? 2 : 1 })} %`;

/** Plus gros détenteurs, lus sur la blockchain, avec la part détenue hors courbe et marché. */
export function HoldersPanel({ holders }: { holders: Holder[] | null }) {
  const people = (holders ?? []).filter((h) => h.kind === "utilisateur" || h.kind === "createur");
  const top10 = people.slice(0, 10).reduce((s, h) => s + h.pct, 0);
  return (
    <section className="surface space-y-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Détenteurs</h2>
        {holders && holders.length > 0 && <span className="text-xs text-muted-foreground">Top 10 : {pct(top10)}</span>}
      </div>
      {holders === null ? (
        <p className="text-sm text-muted-foreground">Lecture de la blockchain indisponible pour le moment.</p>
      ) : holders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun détenteur pour l&apos;instant.</p>
      ) : (
        <ol className="space-y-2 text-sm">
          {holders.slice(0, 12).map((h, i) => {
            const special = h.kind === "courbe" || h.kind === "marche";
            return (
              <li key={`${h.owner}-${i}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>
                    {special ? (
                      <span className="text-muted-foreground">{LABEL[h.kind]}</span>
                    ) : (
                      <Link href={`/profil/${h.owner}`} className="hover:text-pervenche">
                        {h.pseudo ?? `${h.owner.slice(0, 4)}…${h.owner.slice(-4)}`}
                      </Link>
                    )}
                    {h.kind === "createur" && <span className="ml-2 rounded-full bg-pervenche/15 px-2 py-0.5 text-[10px] text-lueur">Créateur</span>}
                  </span>
                  <a href={explorerUrl("address", h.owner)} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-xs hover:text-foreground">
                    {pct(h.pct)}
                  </a>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className={`h-full ${special ? "bg-white/20" : h.kind === "createur" ? "bg-pervenche" : "bg-achat/70"}`} style={{ width: `${Math.min(100, Math.max(h.pct, 0.5))}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-[11px] text-muted-foreground/80">Lu sur la blockchain. La courbe et le marché sont des programmes, pas des personnes : ils sont exclus du top 10.</p>
    </section>
  );
}
