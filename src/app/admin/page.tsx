import type { Metadata } from "next";
import { DbcConfigPanel } from "@/components/admin/DbcConfigPanel";
import { ModerationPanel, type HiddenToken, type ReportGroup } from "@/components/admin/ModerationPanel";
import { RevenuePanel, type RevenueToken } from "@/components/admin/RevenuePanel";
import { VaultPanel, type VaultToken } from "@/components/admin/VaultPanel";
/** Configurations d'avant le coffre : leurs frais vont au wallet du fondateur ; toutes les autres versent au coffre. */
const FOUNDER_FEE_CONFIGS = (process.env.NEXT_PUBLIC_DBC_LEGACY_FOUNDER_CONFIGS ?? "").split(",").map((c) => c.trim()).filter(Boolean);
import { supabaseAdmin } from "@/lib/supabase/server";
import { MissingEnvError } from "@/lib/env";
import { requireAdmin, type Profile } from "@/lib/auth/session";
import { getWaitlistCount } from "@/lib/waitlist";
import { WeeklyPost } from "@/components/admin/WeeklyPost";
import { SnapshotPanel } from "@/components/admin/SnapshotPanel";
import { getWeek } from "@/lib/weekly-data";

export const metadata: Metadata = { title: "Administration — Tiers-État" };

export default async function AdminPage() {
  let admin: Profile | null = null;
  let configError = false;
  try {
    admin = await requireAdmin();
  } catch (err) {
    if (!(err instanceof MissingEnvError)) throw err;
    configError = true;
  }

  if (!admin) {
    return (
      <div className="surface mx-auto max-w-lg space-y-2 p-10 text-center">
        <h1 className="text-2xl font-semibold">Accès réservé</h1>
        <p className="text-muted-foreground">
          {configError
            ? "Supabase n'est pas encore configuré sur ce serveur."
            : "Connecte un wallet administrateur puis clique sur « Se connecter »."}
        </p>
      </div>
    );
  }

  const db = supabaseAdmin();
  const waitlist = await getWaitlistCount().catch(() => null);
  const lastWeek = await getWeek(1).catch(() => null);
  // Annonce sans emoji, factuelle, < 280 caractères (le lien compte pour 23)
  const weeklyPost = lastWeek?.winner
    ? `Le Mème de la semaine sur Tiers-État : ${lastWeek.winner.name} ($${lastWeek.winner.ticker}).\n\n${lastWeek.winner.traders} traders, ${lastWeek.winner.volumeSol.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} SOL échangés par la communauté.\n\nUne nouvelle semaine commence.\ntiersetat.vercel.app/semaine`
    : null;
  const [{ data: reports }, { data: hidden }, { data: words }, { data: allTokens }] = await Promise.all([
    db
      .from("reports")
      .select("mint, reason, details, created_at, tokens!inner(name, ticker, hidden)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("tokens").select("mint, name, ticker, hidden_reason, hidden_at").eq("hidden", true).order("hidden_at", { ascending: false }).limit(200),
    db.from("blocked_words").select("word").order("word"),
    db.from("tokens").select("mint, name, ticker, pool, config").order("created_at", { ascending: false }).limit(200),
  ]);

  // Regroupe les signalements par token
  const groups = new Map<string, ReportGroup>();
  for (const r of (reports ?? []) as unknown as Array<{ mint: string; reason: string; details: string | null; created_at: string; tokens: { name: string; ticker: string; hidden: boolean } }>) {
    const g = groups.get(r.mint) ?? { mint: r.mint, name: r.tokens.name, ticker: r.tokens.ticker, hidden: r.tokens.hidden, reasons: {}, details: [], lastAt: r.created_at };
    g.reasons[r.reason] = (g.reasons[r.reason] ?? 0) + 1;
    if (r.details) g.details.push(r.details);
    groups.set(r.mint, g);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
        <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{admin.wallet}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <ModerationPanel
          reports={[...groups.values()]}
          hidden={(hidden ?? []) as HiddenToken[]}
          words={(words ?? []).map((w) => w.word as string)}
        />
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <WeeklyPost text={weeklyPost} />
          <SnapshotPanel />
          <section className="surface space-y-3 p-5">
            <h2 className="font-semibold">Liste d&apos;attente du lancement</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono text-2xl font-semibold text-foreground">{(waitlist ?? 0).toLocaleString("fr-FR")}</span> inscrits
              {waitlist === null && " (table à créer dans Supabase)"}
            </p>
            <a href="/api/admin/waitlist" className="btn-ghost inline-flex text-sm">
              Télécharger la liste (CSV)
            </a>
          </section>
          <VaultPanel tokens={((allTokens ?? []) as (VaultToken & { config: string })[]).filter((t) => !FOUNDER_FEE_CONFIGS.includes(t.config))} />
          <RevenuePanel tokens={((allTokens ?? []) as (RevenueToken & { config: string })[]).filter((t) => FOUNDER_FEE_CONFIGS.includes(t.config))} />
          <DbcConfigPanel />
        </div>
      </div>
    </div>
  );
}
