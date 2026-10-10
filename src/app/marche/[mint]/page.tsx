import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { searchRadar } from "@/lib/radar";
import { age, alertes, isSolanaAddress } from "@/lib/radar-utils";
import { pct, usd } from "@/lib/market-format";
import { supabasePublic } from "@/lib/supabase/public";
import { WatchStar } from "@/components/market/WatchStar";
import { BuyPanel } from "@/components/market/BuyPanel";
import { CopyAddress } from "@/components/radar/CopyAddress";
import { feteColor } from "@/components/brand/TokenCard";

async function load(mint: string) {
  if (!isSolanaAddress(mint)) return null;
  const [t] = await searchRadar(mint).catch(() => []);
  return t ?? null;
}

export async function generateMetadata({ params }: PageProps<"/marche/[mint]">): Promise<Metadata> {
  const t = await load((await params).mint);
  return { title: t ? `${t.symbol} — ${usd(t.priceUsd)} — Tiers-État` : "Token — Tiers-État" };
}

/** Fiche d'un token Solana (hors Tiers-État) : cours, graphique, chiffres clés, alertes, achat en dollars. */
export default async function MarchePage({ params }: PageProps<"/marche/[mint]">) {
  const { mint } = await params;
  if (!isSolanaAddress(mint)) notFound();
  // Un mème Tiers-État a sa propre page, plus complète
  const { data: ours } = await supabasePublic().from("tokens").select("mint").eq("mint", mint).maybeSingle();
  if (ours) redirect(`/token/${mint}`);

  const t = await load(mint);
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
  const pair = t.dexUrl.match(/dexscreener\.com\/solana\/([a-z0-9]{32,44})/i)?.[1];
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
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-5">
        <header className="flex items-start gap-4">
          {t.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- image du token (domaine variable)
            <img src={t.imageUrl} alt="" className="size-16 shrink-0 rounded-3xl bg-muted object-cover" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-3xl text-2xl font-extrabold" style={{ background: c.bg, color: c.fg }}>
              {t.symbol.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-extrabold">{t.symbol}</h1>
            <p className="truncate text-sm text-muted-foreground">{t.name}</p>
            <CopyAddress address={t.address} />
          </div>
          <WatchStar address={t.address} />
        </header>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="font-[family-name:var(--font-display)] text-5xl font-extrabold">{usd(t.mcapUsd)}</p>
          <p className={`pb-1.5 font-mono text-lg font-bold ${up ? "text-achat" : "text-vente"}`}>{pct(t.change.h24)} 24 h</p>
        </div>

        {pair && (
          <div className="surface overflow-hidden p-0">
            <iframe
              title={`Graphique ${t.symbol}`}
              src={`https://dexscreener.com/solana/${pair}?embed=1&loadChartSettings=0&trades=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=marketCap&interval=15`}
              className="h-[26rem] w-full border-0 sm:h-[30rem]"
              loading="lazy"
            />
          </div>
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
      </aside>
    </div>
  );
}
