import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/social/Avatar";
import { ClanBadge } from "@/components/social/ClanBadge";
import { displayName } from "@/lib/display";
import { clanRanking, topCreators, topTraders, type RankedProfile } from "@/lib/leaderboards";

export const metadata: Metadata = { title: "Classements de la semaine — Tiers-État" };

const TABS = { createurs: "Créateurs", traders: "Traders", clans: "Clans" } as const;
type Tab = keyof typeof TABS;
const fmt = (n: number, d = 2) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: d });

function Rank({ n, active = true }: { n: number; active?: boolean }) {
  // Pas de médaille sans activité (classement vide en début de semaine)
  const medal = active ? ["🥇", "🥈", "🥉"][n - 1] : undefined;
  return <span className="w-8 shrink-0 text-center font-mono text-sm text-muted-foreground">{medal ?? n}</span>;
}

function Who({ p }: { p: RankedProfile }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar wallet={p.wallet} pseudo={p.pseudo} url={p.avatar_url} size={34} />
      <div className="min-w-0">
        <Link href={`/profil/${p.wallet}`} className="block truncate font-medium hover:text-pervenche">
          {displayName(p)}
        </Link>
        {p.clan && <ClanBadge clan={p.clan} />}
      </div>
    </div>
  );
}

function Empty() {
  return <p className="p-8 text-center text-sm text-muted-foreground">Personne au classement cette semaine. La première place est libre.</p>;
}

export default async function ClassementsPage({ searchParams }: PageProps<"/classements">) {
  const raw = (await searchParams).tab;
  const tab: Tab = typeof raw === "string" && raw in TABS ? (raw as Tab) : "createurs";

  // Lecture des données d'abord, affichage ensuite (pas de JSX dans le try/catch)
  let data:
    | { kind: "createurs"; rows: Awaited<ReturnType<typeof topCreators>> }
    | { kind: "traders"; rows: Awaited<ReturnType<typeof topTraders>> }
    | { kind: "clans"; rows: Awaited<ReturnType<typeof clanRanking>> }
    | null = null;
  try {
    if (tab === "createurs") data = { kind: "createurs", rows: await topCreators() };
    else if (tab === "traders") data = { kind: "traders", rows: await topTraders() };
    else data = { kind: "clans", rows: await clanRanking() };
  } catch (err) {
    console.error("classements", err);
  }

  let body: React.ReactNode;
  if (!data) {
    body = <p className="p-8 text-center text-sm text-muted-foreground">Classement momentanément indisponible.</p>;
  } else if (data.rows.length === 0) {
    body = <Empty />;
  } else if (data.kind === "createurs") {
    body = (
      <ol className="divide-y divide-ligne">
        {data.rows.map((r, i) => (
          <li key={r.wallet} className="flex items-center gap-3 px-5 py-3.5">
            <Rank n={i + 1} />
            <Who p={r} />
            <div className="text-right">
              <p className="font-mono text-sm font-medium">{fmt(r.volume_sol)} SOL</p>
              <p className="text-xs text-muted-foreground">
                {r.tokens_launched} token{r.tokens_launched > 1 ? "s" : ""} · {r.trades_count} échanges
              </p>
            </div>
          </li>
        ))}
      </ol>
    );
  } else if (data.kind === "traders") {
    body = (
      <ol className="divide-y divide-ligne">
        {data.rows.map((r, i) => (
          <li key={r.wallet} className="flex items-center gap-3 px-5 py-3.5">
            <Rank n={i + 1} />
            <Who p={r} />
            <div className="text-right">
              <p className="font-mono text-sm font-medium">{fmt(r.volume_sol)} SOL</p>
              <p className="text-xs text-muted-foreground">{r.trades_count} échanges</p>
            </div>
          </li>
        ))}
      </ol>
    );
  } else {
    body = (
      <ol className="divide-y divide-ligne">
        {data.rows.map((c, i) => (
          <li key={c.slug} className="flex items-center gap-3 px-5 py-3.5">
            <Rank n={i + 1} active={Number(c.volume_sol) > 0 || c.members > 0} />
            <div className="flex-1">
              <ClanBadge clan={c} size="lg" />
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-medium">{fmt(c.volume_sol)} SOL</p>
              <p className="text-xs text-muted-foreground">
                {c.members} membre{c.members > 1 ? "s" : ""} · {c.tokens_launched} token{c.tokens_launched > 1 ? "s" : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Classements de la semaine</h1>
        <p className="text-sm text-muted-foreground">Remise à zéro chaque lundi à minuit (heure de Paris). Classement au volume échangé, pas aux gains.</p>
        <Link href="/semaine" className="inline-flex text-sm text-soleil underline-offset-4 hover:underline">
          🏆 Voir le concours du Mème de la semaine →
        </Link>
      </header>
      <nav className="flex gap-2" aria-label="Type de classement">
        {(Object.keys(TABS) as Tab[]).map((k) => (
          <Link key={k} href={k === "createurs" ? "/classements" : `/classements?tab=${k}`} className={`chip ${tab === k ? "chip-active" : ""}`} aria-current={tab === k ? "page" : undefined}>
            {TABS[k]}
          </Link>
        ))}
      </nav>
      <section className="surface overflow-hidden">{body}</section>
    </div>
  );
}
