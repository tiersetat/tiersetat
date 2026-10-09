import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/social/Avatar";
import { PositionShare } from "@/components/token/PositionShare";
import { displayName } from "@/lib/display";
import { formatDuration } from "@/lib/position";
import { getPositionData } from "@/lib/position-data";
import { explorerUrl, SITE_URL } from "@/lib/solana/config";
import { solanaAddress } from "@/lib/validators";

const sol = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: n < 1 ? 4 : 2 })} SOL`;
const price = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("fr-FR", { maximumSignificantDigits: 4 })} SOL`);
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toLocaleString("fr-FR", { maximumFractionDigits: n > -100 && Math.abs(n) < 10 ? 1 : 0 })} %`;
const dateTime = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const tokens = (n: number) => n.toLocaleString("fr-FR", { notation: "compact", maximumFractionDigits: 2 });

async function load(params: PageProps<"/token/[mint]/position/[wallet]">["params"]) {
  const { mint, wallet } = await params;
  if (!solanaAddress.safeParse(mint).success || !solanaAddress.safeParse(wallet).success) return null;
  return getPositionData(mint, wallet);
}

export async function generateMetadata({ params }: PageProps<"/token/[mint]/position/[wallet]">): Promise<Metadata> {
  const data = await load(params);
  if (!data) return { title: "Position — Tiers-État" };
  const { token, trader, position } = data;
  const perf = position.pnlPct === null ? "" : ` ${pct(position.pnlPct)}`;
  return {
    title: `${displayName(trader)} sur $${token.ticker}${perf} — Tiers-État`,
    description: `Récap de position sur ${token.name} ($${token.ticker}), le launchpad des mèmes français.`,
  };
}

export default async function PositionPage({ params }: PageProps<"/token/[mint]/position/[wallet]">) {
  const data = await load(params);
  if (!data) notFound();
  const { token, trader, position: p } = data;
  const gain = p.pnlSol >= 0;
  const now = new Date().toISOString();
  const url = `${SITE_URL}/token/${token.mint}/position/${trader.wallet}`;
  const shareText =
    p.multiple !== null && p.multiple >= 1
      ? `x${p.multiple.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} sur $${token.ticker} 🇫🇷 Frappé sur Tiers-État, le launchpad des mèmes français.`
      : `Ma position sur $${token.ticker}, frappé sur Tiers-État, le launchpad des mèmes français 🇫🇷`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href={`/token/${token.mint}`} className="text-sm text-muted-foreground hover:text-foreground">
        ← {token.name}
      </Link>

      <section className="surface relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className={`pointer-events-none absolute -top-24 right-0 size-72 rounded-full blur-[100px] ${gain ? "bg-achat/25" : "bg-vente/25"}`}
        />
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du token */}
          <img src={token.image_url} alt="" width={64} height={64} className="size-16 rounded-2xl object-cover" />
          <div>
            <p className="text-xl font-semibold">{token.name}</p>
            <p className="font-mono text-sm text-pervenche">${token.ticker}</p>
          </div>
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${p.closed ? "bg-white/5 text-muted-foreground" : "bg-achat/15 text-achat"}`}>
            {p.closed ? "Position clôturée" : "Position ouverte"}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className={`text-6xl font-bold tracking-tight sm:text-7xl ${gain ? "text-achat" : "text-vente"}`}>
            {p.pnlPct === null ? "—" : pct(p.pnlPct)}
          </p>
          <div className="pb-2">
            {p.multiple !== null && <p className="font-mono text-2xl">x{p.multiple.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</p>}
            <p className={`text-sm ${gain ? "text-achat" : "text-vente"}`}>
              {gain ? "+" : ""}
              {sol(p.pnlSol)}
            </p>
          </div>
        </div>

        <Link href={`/profil/${trader.wallet}`} className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Avatar wallet={trader.wallet} pseudo={trader.pseudo} url={trader.avatar_url} size={24} />
          {displayName(trader)}
        </Link>

        <dl className="mt-8 grid gap-4 border-t border-ligne pt-6 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Entrée</dt>
            <dd className="mt-1 font-medium">{p.firstBuyAt ? dateTime(p.firstBuyAt) : "—"}</dd>
            <dd className="text-muted-foreground">
              {sol(p.spentSol)} · prix moyen {price(p.avgBuyPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{p.closed ? "Sortie" : "Ventes"}</dt>
            <dd className="mt-1 font-medium">{p.lastSellAt ? dateTime(p.lastSellAt) : "Pas encore vendu"}</dd>
            <dd className="text-muted-foreground">
              {sol(p.receivedSol)} · prix moyen {price(p.avgSellPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{p.closed ? "Durée de détention" : "Détenu depuis"}</dt>
            <dd className="mt-1 font-medium">{p.firstBuyAt ? formatDuration(p.firstBuyAt, p.closed && p.lastSellAt ? p.lastSellAt : now) : "—"}</dd>
            {!p.closed && (
              <dd className="text-muted-foreground">
                {tokens(p.heldTokens)} tokens · {sol(p.valueSol)}
              </dd>
            )}
          </div>
        </dl>
      </section>

      <PositionShare url={url} text={shareText} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Chaque trade, vérifiable sur la blockchain</h2>
        <ol className="relative space-y-3 border-l border-ligne pl-6">
          {p.trades.map((t) => (
            <li key={t.signature} className="relative">
              <span className={`absolute -left-[29px] top-1.5 size-2.5 rounded-full ${t.side === "buy" ? "bg-achat" : "bg-vente"}`} />
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <p>
                  <span className={`font-medium ${t.side === "buy" ? "text-achat" : "text-vente"}`}>{t.side === "buy" ? "Achat" : "Vente"}</span>{" "}
                  de {tokens(Number(t.token_amount))} tokens pour {sol(Number(t.sol_amount))}
                </p>
                <a href={explorerUrl("tx", t.signature)} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                  {dateTime(t.block_time)} ↗
                </a>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          Calcul d&apos;après les trades indexés par Tiers-État, frais inclus. Les tokens encore détenus sont valorisés au prix actuel de la courbe.
          Performances passées, pas un conseil financier.
        </p>
      </section>
    </div>
  );
}
