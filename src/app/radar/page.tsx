import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { RadarCard } from "@/components/radar/RadarCard";
import { searchRadar, trendingRadar, type RadarToken } from "@/lib/radar";
import { pct, usd } from "@/lib/radar-utils";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "Radar memecoins — Tiers-État",
  description: "Colle l'adresse ou le ticker d'un memecoin Solana : prix, capitalisation, liquidité, volume et signaux d'alerte en un coup d'œil.",
};

const tone = (n: number | null) => (n === null ? "text-muted-foreground" : n >= 0 ? "text-achat" : "text-vente");

export default async function RadarPage({ searchParams }: PageProps<"/radar">) {
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.trim().slice(0, 64) : "";

  let results: RadarToken[] = [];
  let searchError: string | null = null;
  if (q) {
    if (!rateLimit(`radar:${clientIp(await headers())}`, 30, 5 * 60_000)) searchError = "Trop de recherches, réessaie dans quelques minutes.";
    else results = await searchRadar(q).catch(() => ((searchError = "Les données du marché sont momentanément indisponibles."), []));
  }
  const trending = await trendingRadar().catch(() => [] as RadarToken[]);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-pervenche">Radar</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Le radar des memecoins</h1>
        <p className="max-w-2xl text-muted-foreground">
          Colle l&apos;adresse d&apos;un token ou son $TICKER : prix, capitalisation, liquidité, volume et signaux d&apos;alerte, en un coup d&apos;œil.
        </p>
      </header>

      <form action="/radar" className="flex max-w-2xl gap-2 rounded-2xl border border-ligne bg-white/[0.03] p-1.5 focus-within:border-pervenche/60">
        <input
          name="q"
          defaultValue={q}
          placeholder="Adresse du token ou $TICKER"
          aria-label="Adresse ou ticker d'un memecoin"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none placeholder:font-sans placeholder:text-muted-foreground/60"
        />
        <button type="submit" className="btn-primary shrink-0 px-5 py-2.5">
          Analyser
        </button>
      </form>

      {q && (
        <section className="space-y-4">
          {searchError ? (
            <p className="surface p-6 text-sm text-muted-foreground">{searchError}</p>
          ) : results.length === 0 ? (
            <p className="surface p-6 text-sm text-muted-foreground">Aucun token Solana trouvé pour « {q} ».</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {results.map((t) => (
                <RadarCard key={t.address} t={t} />
              ))}
            </div>
          )}
        </section>
      )}

      {trending.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Ça chauffe sur Solana</h2>
            <p className="text-sm text-muted-foreground">Les memecoins les plus actifs en ce moment, classés par activité réelle (aucune mise en avant payante).</p>
          </div>
          <div className="surface overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Token</th>
                  <th className="px-2 py-3 text-right font-medium">Capitalisation</th>
                  <th className="px-2 py-3 text-right font-medium">Volume 24 h</th>
                  <th className="px-2 py-3 text-right font-medium">1 h</th>
                  <th className="px-4 py-3 text-right font-medium">24 h</th>
                </tr>
              </thead>
              <tbody>
                {trending.map((t, i) => (
                  <tr key={t.address} className="border-t border-ligne hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-3">
                      <Link href={`/radar?q=${t.address}`} className="font-medium hover:text-pervenche">
                        ${t.symbol}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-right font-mono">{usd(t.mcapUsd)}</td>
                    <td className="px-2 py-3 text-right font-mono">{usd(t.volume24Usd)}</td>
                    <td className={`px-2 py-3 text-right font-mono ${tone(t.change.h1)}`}>{pct(t.change.h1)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${tone(t.change.h24)}`}>{pct(t.change.h24)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="space-y-1 text-xs text-muted-foreground/80">
        <p>
          Données publiques du réseau Solana principal, fournies par DexScreener et GeckoTerminal, mises à jour toutes les minutes. Ces tokens ne
          sont pas créés sur Tiers-État : nous ne les vérifions pas et ne les recommandons pas.
        </p>
        <p>Information uniquement, pas un conseil financier. La plupart des memecoins perdent l&apos;essentiel de leur valeur.</p>
      </footer>
    </div>
  );
}
