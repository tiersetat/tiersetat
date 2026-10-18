import type { Metadata } from "next";
import Link from "next/link";
import { LiveActivity } from "@/components/social/LiveActivity";
import { notFound, redirect } from "next/navigation";
import { searchRadar, tokenOnChain } from "@/lib/radar";
import { CHAINS, isChain } from "@/lib/market-feeds";
import { ChartPanel } from "@/components/market/ChartPanel";
import { geckoNetwork, intervalForAge } from "@/lib/chart-feeds";
import { age, alertes, isSolanaAddress } from "@/lib/radar-utils";
import { pct, usd } from "@/lib/market-format";
import { supabasePublic } from "@/lib/supabase/public";
import { WatchStar } from "@/components/market/WatchStar";
import { BuyPanel } from "@/components/market/BuyPanel";
import { CopyAddress } from "@/components/radar/CopyAddress";
import { feteColor } from "@/components/brand/TokenCard";
import { jupInfo } from "@/lib/jup-info";

const isEvmAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);

async function load(mint: string, chain: string) {
  if (chain !== "solana") return isEvmAddress(mint) ? tokenOnChain(chain, mint).catch(() => null) : null;
  if (!isSolanaAddress(mint)) return null;
  const [t] = await searchRadar(mint).catch(() => []);
  return t ?? null;
}
const chainOf = (c: unknown) => (isChain(c) ? c : "solana");

export async function generateMetadata({ params, searchParams }: PageProps<"/marche/[mint]">): Promise<Metadata> {
  const t = await load((await params).mint, chainOf((await searchParams).c));
  if (!t) return { title: "Token — Tiers-État" };
  const description = `${t.name} ($${t.symbol}) · Capitalisation ${usd(t.mcapUsd)} · ${pct(t.change.h24)} sur 24 h · Liquidité ${usd(t.liquidityUsd)} · Créé il y a ${age(t.createdAt)}. Données publiques, pour information.`;
  return { title: `${t.symbol} — ${usd(t.priceUsd)} — Tiers-État`, description, openGraph: { description }, twitter: { card: "summary_large_image", description } };
}

/** Fiche d'un token Solana (hors Tiers-État) : cours, graphique, chiffres clés, alertes, achat en dollars. */
export default async function MarchePage({ params, searchParams }: PageProps<"/marche/[mint]">) {
  const { mint } = await params;
  const chain = chainOf((await searchParams).c);
  if (chain === "solana" ? !isSolanaAddress(mint) : !isEvmAddress(mint)) notFound();
  // Un mème Tiers-État a sa propre page, plus complète
  if (chain === "solana") {
    const { data: ours } = await supabasePublic().from("tokens").select("mint").eq("mint", mint).maybeSingle();
    if (ours) redirect(`/token/${mint}`);
  }

  const [t, info] = await Promise.all([load(mint, chain), chain === "solana" ? jupInfo(mint) : Promise.resolve(null)]);
  if (!t) {
    return (
      <div className="surface mx-auto max-w-lg space-y-3 p-8 text-center">
        <h1 className="text-2xl font-extrabold">Token introuvable</h1>
        <p className="text-sm text-muted-foreground">Aucun marché actif n&apos;a été trouvé pour cette adresse sur Solana.</p>
        <Link href="/?tri=solana#explorer" className="btn-ghost">
          Voir les tendances
        </Link>
      </div>
    );
  }
  const pair = t.pair ?? t.dexUrl.match(/dexscreener\.com\/[a-z]+\/([a-z0-9]{32,44})/i)?.[1];
  const network = geckoNetwork(chain);
  const c = feteColor(t.symbol + t.name);
  const warnings = alertes(t);
  const up = (t.change.h24 ?? 0) >= 0;
  const stats: [string, string][] = [
    ["Capitalisation", usd(t.mcapUsd)],
    ["Prix", usd(t.priceUsd)],
    ["Vol. 24 h", usd(t.volume24Usd)],
    ["Liquidité", usd(t.liquidityUsd)],
    ["Achats 24 h", t.buys24?.toLocaleString("fr-FR") ?? "—"],
    ["Ventes 24 h", t.sells24?.toLocaleString("fr-FR") ?? "—"],
    ["Âge", age(t.createdAt)],
    ["Variation 1 h", pct(t.change.h1)],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] xl:grid-cols-1 min-[1800px]:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-5">
        {/* L'image du token et, juste à côté, tout ce qu'il faut savoir avant de trader */}
        <header className="flex items-start gap-4 sm:gap-6">
          {t.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- image du token (domaine variable)
            <img src={t.imageUrl} alt="" className="size-20 shrink-0 rounded-3xl bg-muted object-cover sm:size-32" />
          ) : (
            <span className="grid size-20 shrink-0 place-items-center rounded-3xl text-3xl font-extrabold sm:size-32 sm:text-5xl" style={{ background: c.bg, color: c.fg }}>
              {t.symbol.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-3xl font-extrabold">{t.symbol}</h1>
                <p className="truncate text-sm text-muted-foreground">
                  {t.name} · <span style={{ color: CHAINS[chain].color }}>{CHAINS[chain].label}</span>
                </p>
              </div>
              <WatchStar address={t.address} />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold sm:text-4xl">{usd(t.mcapUsd)}</p>
              <p className={`font-mono text-base font-bold ${up ? "text-achat" : "text-vente"}`}>{pct(t.change.h24)} 24 h</p>
            </div>
            <dl className="flex flex-wrap gap-1.5 text-xs">
              {(
                [
                  ["Prix", usd(t.priceUsd)],
                  ["Liquidité", usd(t.liquidityUsd)],
                  ["Vol. 24 h", usd(t.volume24Usd)],
                  ["Âge", age(t.createdAt)],
                  ...(info?.holders != null ? [["Détenteurs", info.holders.toLocaleString("fr-FR")]] : []),
                  ...(info?.top10Pct != null ? [["Top 10", `${Math.round(info.top10Pct)} %`]] : []),
                  ...(info?.devMints != null ? [["Créateur", `${info.devMints.toLocaleString("fr-FR")} token${info.devMints > 1 ? "s" : ""} lancé${info.devMints > 1 ? "s" : ""}`]] : []),
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className={`flex gap-1.5 rounded-full px-2.5 py-1 ${k === "Créateur" && (info?.devMints ?? 0) > 50 ? "bg-vente/15 text-vente" : "bg-white/[0.06]"}`}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-mono font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-2">
              <CopyAddress address={t.address} />
              {t.links.slice(0, 4).map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer nofollow" className="chip px-2.5 py-0.5 text-xs">
                  {l.label} ↗
                </a>
              ))}
            </div>
          </div>
        </header>

        {pair && (
          <ChartPanel
            source={{ kind: "gecko", network, pool: pair, chain, token: t.address, dex: t.dexId, quote: t.quoteAddress }}
            pro={{ chain, network, pair }}
            defaultInterval={intervalForAge(t.createdAt)}
          />
        )}

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k} className="surface px-4 py-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-mono font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        {warnings.length > 0 && (
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li key={w.texte} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${w.niveau === "danger" ? "bg-vente/15 text-vente" : "bg-soleil/15 text-soleil"}`}>
                {w.niveau === "danger" ? "⚠ " : "• "}
                {w.texte}
              </li>
            ))}
          </ul>
        )}

        {t.links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {t.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer nofollow" className="chip">
                {l.label} ↗
              </a>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Token non vérifié par Tiers-État. Données publiques DexScreener, pour information : ce n&apos;est pas une recommandation d&apos;achat.
        </p>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <BuyPanel symbol={t.symbol} />
        <div className="space-y-2 xl:hidden">
          <h2 className="px-1 text-lg font-extrabold">Ce que le monde achète</h2>
          <LiveActivity limit={6} />
        </div>
      </aside>
    </div>
  );
}
