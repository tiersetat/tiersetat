import Link from "next/link";
import { usd } from "@/lib/market-format";
import { displayName } from "@/lib/display";
import { editionLine, editionNumber } from "@/lib/gazette-text";
import { CLUSTER } from "@/lib/solana/config";
import type { Gazette as GazetteData } from "@/lib/gazette";
import type { FeedItem } from "@/lib/feed";

/** Couleurs lisibles sur le papier (plus soutenues que celles du fond nuit). */
const INK = { up: "text-[#0b8a4f]", down: "text-[#c8102e]", roi: "text-[#2340d6]" };

function time(iso: string) {
  const d = new Date(iso);
  const [h, m] = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).split(":");
  return `${Number(h)} h ${m}`;
}

function Dispatch({ it }: { it: FeedItem }) {
  const who = displayName(it.author);
  if (it.kind === "trade") {
    return (
      <>
        <span className="font-bold">{who}</span> {it.side === "buy" ? "achète" : "vend"} {usd(it.usd)} de{" "}
        <Link href={`/token/${it.token.mint}`} className={`font-bold underline decoration-1 underline-offset-2 ${it.side === "buy" ? INK.up : INK.down}`}>
          ${it.token.ticker}
        </Link>
      </>
    );
  }
  return (
    <>
      « {it.body.length > 90 ? `${it.body.slice(0, 90)}…` : it.body} » <span className="font-bold">{who}</span>, sur{" "}
      <Link href={`/token/${it.token.mint}`} className="font-bold underline decoration-1 underline-offset-2">
        ${it.token.ticker}
      </Link>
    </>
  );
}

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-gazette border-b-2 gazette-rule pb-1 text-xl font-black uppercase tracking-wide">{children}</h3>;
}

/** La Gazette du Tiers-État : le journal du peuple, mis à jour en direct. */
export function Gazette({ data }: { data: GazetteData }) {
  const { une, movers, topics, dispatches, at: now } = data;
  const beta = (CLUSTER as string) === "devnet";
  return (
    <article className="gazette relative overflow-hidden rounded-[28px] px-4 py-5 sm:px-8 sm:py-7">
      {/* Bandeau d'édition */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b gazette-rule pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] sm:text-[11px]">
        <span>N° {editionNumber(now)}</span>
        <span className="text-center" suppressHydrationWarning>
          {editionLine(now)}
        </span>
        <span>{beta ? "Bêta · argent fictif" : "Gratuit"}</span>
      </div>

      {/* Titre du journal */}
      <header className="border-b-4 border-double gazette-rule py-3 text-center sm:py-4">
        <h1 className="font-gazette text-[2.35rem] leading-none font-black tracking-tight sm:text-7xl">La Gazette du Tiers-État</h1>
        <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] sm:text-xs">Le peuple frappe sa monnaie · Mis à jour en direct</p>
      </header>

      {/* La Une */}
      {une && (
        <section className="grid gap-5 border-b gazette-rule py-5 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div className="space-y-3">
            <p className={`font-mono text-xs font-bold uppercase tracking-[0.25em] ${INK.down}`}>{une.kicker}</p>
            <h2 className="font-gazette text-4xl leading-[1.05] font-black italic sm:text-6xl">
              <Link href={une.href} className="hover:underline">
                {une.title}
              </Link>
            </h2>
            <p className="max-w-prose text-[15px] leading-relaxed text-[#2c2f55]">
              {une.kind === "meme" &&
                `${une.name} a déjà fait ${Math.round(une.progress)} % du chemin vers la Bastille${une.trades ? `, avec ${une.trades} échange${une.trades > 1 ? "s" : ""} en 24 heures` : ""}.`}
              {une.kind === "topic" && `${une.articles} articles en quelques heures. Les mèmes les plus drôles naissent de l'actualité : à toi d'en faire un mème, avant tout le monde.`}
              {une.kind === "solana" && `Capitalisation de ${usd(une.item.mcapUsd)} pour ce token de Solana, le plus en vue du moment.`}
            </p>
            <Link href={une.href} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-encre px-6 py-3 text-[15px] font-extrabold text-papier transition active:scale-95">
              {une.kind === "topic" ? "Frapper le mème" : une.kind === "meme" ? `Voir $${une.ticker}` : "Voir le token"} →
            </Link>
          </div>
          {une.kind === "topic" ? (
            <div className="hidden aspect-[4/3] flex-col items-center justify-center gap-4 rounded-2xl border-2 gazette-rule p-6 text-center md:flex">
              <span className="font-gazette text-8xl leading-[0.85] font-black">{une.sources}</span>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.25em]">médias en parlent</span>
            </div>
          ) : (
            une.image && (
              <figure className="overflow-hidden rounded-2xl border-2 gazette-rule">
                {/* eslint-disable-next-line @next/next/no-img-element -- image du mème (domaine variable) */}
                <img src={une.image} alt="" className="aspect-[4/3] w-full object-cover" />
              </figure>
            )
          )}
        </section>
      )}

      {/* Trois colonnes */}
      <div className="grid gap-6 pt-5 md:grid-cols-3 md:gap-0 md:divide-x md:divide-[var(--encre)]">
        <section className="space-y-3 md:pr-5">
          <ColumnTitle>La Bourse du peuple</ColumnTitle>
          <ul className="divide-y divide-[rgb(16_18_46/0.15)]">
            {movers.map((m) => (
              <li key={m.address}>
                <Link href={m.href ?? `/marche/${m.address}`} className="flex items-baseline justify-between gap-3 py-2 hover:underline">
                  <span className="truncate font-bold">${m.symbol}</span>
                  <span className={`shrink-0 font-mono text-sm font-bold ${(m.change24 ?? 0) >= 0 ? INK.up : INK.down}`}>
                    {(m.change24 ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(m.change24 ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                  </span>
                </Link>
              </li>
            ))}
            {movers.length === 0 && <li className="py-2 text-sm">Cotations momentanément indisponibles.</li>}
          </ul>
        </section>
        <section className="space-y-3 md:px-5">
          <ColumnTitle>Ça brûle</ColumnTitle>
          <ul className="divide-y divide-[rgb(16_18_46/0.15)]">
            {topics.map((t) => (
              <li key={t.label} className="flex items-baseline justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{t.label}</span>
                  <span className="text-xs text-[#4a4d75]">{t.sources} médias</span>
                </span>
                <Link href={t.href} className={`shrink-0 text-sm font-extrabold underline decoration-1 underline-offset-2 ${INK.roi}`}>
                  Frapper →
                </Link>
              </li>
            ))}
            {topics.length === 0 && <li className="py-2 text-sm">L&apos;actualité arrive…</li>}
          </ul>
        </section>
        <section className="space-y-3 md:pl-5">
          <ColumnTitle>Dépêches</ColumnTitle>
          <ul className="space-y-2.5">
            {dispatches.map((d) => (
              <li key={d.id} className="text-[14px] leading-snug">
                <span className="font-mono text-xs font-bold" suppressHydrationWarning>
                  {time(d.at)} —{" "}
                </span>
                <Dispatch it={d} />
              </li>
            ))}
            {dispatches.length === 0 && <li className="text-sm leading-snug">Aucune dépêche pour l&apos;instant. Le premier échange de la journée fera la une de cette colonne.</li>}
          </ul>
          <Link href="/fil" className={`inline-block text-sm font-extrabold underline decoration-1 underline-offset-2 ${INK.roi}`}>
            Toutes les dépêches →
          </Link>
        </section>
      </div>
    </article>
  );
}
