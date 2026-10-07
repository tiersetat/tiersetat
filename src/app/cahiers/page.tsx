import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/social/Avatar";
import { ClanBadge } from "@/components/social/ClanBadge";
import { InviteCard } from "@/components/invite/InviteCard";
import { FounderBadge, FounderGauge } from "@/components/trust/FounderBadge";
import { getSessionWallet } from "@/lib/auth/session";
import { RANGS, REGLES } from "@/lib/cahiers";
import { getCahiers } from "@/lib/cahiers-data";
import { displayName } from "@/lib/display";

export const metadata: Metadata = {
  title: "Cahiers de doléances — Tiers-État",
  description: "Chaque action utile sur Tiers-État est inscrite dans ton cahier. Les premiers bâtisseurs seront reconnus.",
};

const pts = (n: number) => n.toLocaleString("fr-FR");

export default async function CahiersPage() {
  const me = await getSessionWallet().catch(() => null);
  const data = await getCahiers(me).catch(() => null);
  const mine = data?.mine;
  const nextRang = mine ? RANGS.find((r) => r.min > mine.cahier.points) : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-pervenche">Programme de points</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Les Cahiers de doléances</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          En 1789, le peuple a écrit ses doléances. Ici, chaque action utile est inscrite dans ton cahier : créer, échanger, rassembler. Les
          premiers bâtisseurs seront reconnus.
        </p>
      </header>

      {mine ? (
        <section className="surface relative overflow-hidden p-6 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-pervenche/20 blur-[100px]" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Ton cahier</p>
              <p className="mt-1 font-mono text-5xl font-semibold">{pts(mine.cahier.points)} pts</p>
              {mine.cahier.founder && (
                <div className="mt-2">
                  <FounderBadge n={mine.cahier.founder} />
                </div>
              )}
              <p className="mt-2 text-sm">
                Rang : <strong className="text-lueur">{mine.cahier.rang}</strong>
                {mine.position && <span className="text-muted-foreground"> · {mine.position}ᵉ sur {pts(data!.total)}</span>}
              </p>
              {nextRang && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Encore {pts(nextRang.min - mine.cahier.points)} points pour devenir {nextRang.titre}.
                </p>
              )}
            </div>
            <ul className="grid min-w-[16rem] gap-1.5 text-sm">
              {mine.cahier.detail.map((d) => (
                <li key={d.key} className="flex justify-between gap-6">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-mono">
                    {pts(d.points)}
                    <span className="text-muted-foreground/60"> / {pts(d.cap)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      {mine && <InviteCard />}
      {!mine && (
        <section className="surface flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-muted-foreground">Connecte-toi pour ouvrir ton cahier et voir tes points.</p>
          <Link href="/demarrer" className="btn-primary">
            Bien démarrer
          </Link>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Le classement</h2>
          {!data ? (
            <p className="surface p-8 text-center text-sm text-muted-foreground">Le classement s&apos;ouvre très bientôt.</p>
          ) : data.top.length === 0 ? (
            <p className="surface p-8 text-center text-sm text-muted-foreground">Aucun cahier encore. Sois le premier : frappe un mème !</p>
          ) : (
            <ol className="surface divide-y divide-ligne">
              {data.top.map((c, i) => (
                <li key={c.wallet} className={`flex items-center gap-3 px-4 py-3 ${c.wallet === me ? "bg-pervenche/10" : ""}`}>
                  <span className="w-8 shrink-0 text-center font-mono text-sm text-muted-foreground">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                  <Avatar wallet={c.wallet} pseudo={c.pseudo} url={c.avatar_url} size={34} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/profil/${c.wallet}`} className="block truncate font-medium hover:text-pervenche">
                      {displayName(c)}
                    </Link>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {c.rang}
                      {c.founder && <FounderBadge n={c.founder} />}
                      {c.clan && <ClanBadge clan={c.clan} />}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold">{pts(c.points)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-6">
          {data?.founders && (
            <section className="surface p-5">
              <FounderGauge taken={data.founders.taken} seats={data.founders.seats} />
            </section>
          )}
          <section className="surface space-y-3 p-5">
            <h2 className="font-semibold">Comment gagner des points</h2>
            <ul className="space-y-2.5 text-sm">
              {REGLES.map((r) => (
                <li key={r.key}>
                  <p className="font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.detail} · max {pts(r.cap)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section className="surface space-y-2 p-5">
            <h2 className="font-semibold">Les rangs</h2>
            <ul className="space-y-1 text-sm">
              {RANGS.map((r) => (
                <li key={r.titre} className="flex justify-between">
                  <span>{r.titre}</span>
                  <span className="font-mono text-muted-foreground">{pts(r.min)}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <p className="text-xs text-muted-foreground">
        Les points n&apos;ont aucune valeur monétaire, ne s&apos;achètent pas et ne s&apos;échangent pas. Ils ne constituent ni une promesse de
        token ni une promesse de récompense. Pendant la bêta, le barème peut évoluer et les points obtenus par des abus (comptes multiples,
        échanges en boucle) peuvent être retirés.
      </p>
    </div>
  );
}
