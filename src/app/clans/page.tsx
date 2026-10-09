import type { Metadata } from "next";
import Link from "next/link";
import { getSessionWallet } from "@/lib/auth/session";
import { clanRanking } from "@/lib/leaderboards";
import { supabasePublic } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Clans — Tiers-État" };

const fmt = (n: number) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export default async function ClansPage() {
  const me = await getSessionWallet();
  const [clans, mine] = await Promise.all([
    clanRanking().catch(() => []),
    me ? supabasePublic().from("profiles").select("clan").eq("wallet", me).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const myClan = (mine.data as { clan: string | null } | null)?.clan ?? null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Les clans</h1>
        <p className="max-w-2xl text-muted-foreground">
          Rejoins le clan de ta région et fais-le grimper au classement de la semaine. Un changement de clan possible par semaine.
        </p>
      </header>
      {clans.length === 0 ? (
        <p className="surface p-8 text-center text-sm text-muted-foreground">Les clans arrivent très bientôt.</p>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clans.map((c, i) => (
            <li key={c.slug}>
              <Link href={`/clans/${c.slug}`} className="surface surface-hover relative block overflow-hidden p-5">
                <div aria-hidden className="absolute -top-10 -right-10 size-32 rounded-full blur-2xl" style={{ background: `hsl(${c.hue} 70% 55% / 0.25)` }} />
                <div className="relative flex items-start justify-between">
                  <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                  {myClan === c.slug && <span className="rounded-full bg-pervenche/15 px-2 py-0.5 text-xs text-lueur">Ton clan</span>}
                </div>
                <h2 className="relative mt-2 text-lg font-semibold" style={{ color: `hsl(${c.hue} 80% 85%)` }}>
                  {c.name}
                </h2>
                <dl className="relative mt-4 grid grid-cols-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Membres</dt>
                    <dd className="font-mono text-sm">{c.members}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Volume</dt>
                    <dd className="font-mono text-sm">{fmt(c.volume_sol)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tokens</dt>
                    <dd className="font-mono text-sm">{c.tokens_launched}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
