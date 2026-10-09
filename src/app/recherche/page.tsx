import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TokenCard } from "@/components/brand/TokenCard";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";
import { supabasePublic } from "@/lib/supabase/public";
import { solanaAddress } from "@/lib/validators";

export const metadata: Metadata = { title: "Recherche — Tiers-État" };

type FoundToken = { mint: string; name: string; ticker: string; image_url: string; market_cap_sol: number; curve_progress: number };
type FoundProfile = { wallet: string; pseudo: string | null; avatar_url: string | null };

/** Retire les caractères ayant un sens dans les filtres PostgREST / LIKE (évite toute injection de filtre). */
function sanitize(q: string) {
  return q.replace(/[,()%*_\\:."'`]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
}

export default async function RecherchePage({ searchParams }: PageProps<"/recherche">) {
  const raw = (await searchParams).q;
  const query = typeof raw === "string" ? raw.trim() : "";
  const db = supabasePublic();

  // Une adresse Solana complète : on va directement au token ou au profil
  if (solanaAddress.safeParse(query).success) {
    const { data } = await db.from("tokens").select("mint").eq("mint", query).maybeSingle();
    redirect(data ? `/token/${query}` : `/profil/${query}`);
  }

  const q = sanitize(query);
  let tokens: FoundToken[] = [];
  let profiles: FoundProfile[] = [];
  if (q.length >= 2) {
    const [t, p] = await Promise.all([
      db
        .from("tokens")
        .select("mint, name, ticker, image_url, market_cap_sol, curve_progress")
        .or(`name.ilike.*${q}*,ticker.ilike.*${q}*`)
        .order("market_cap_sol", { ascending: false })
        .limit(24),
      db.from("profiles").select("wallet, pseudo, avatar_url").ilike("pseudo", `*${q}*`).limit(12),
    ]);
    tokens = (t.data ?? []) as FoundToken[];
    profiles = (p.data ?? []) as FoundProfile[];
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Recherche</h1>
        <form action="/recherche" className="flex max-w-xl gap-2">
          <input name="q" defaultValue={query} className="field" placeholder="Nom, ticker, pseudo ou adresse" autoFocus aria-label="Rechercher" />
          <button type="submit" className="btn-primary shrink-0">
            Chercher
          </button>
        </form>
      </header>

      {q.length < 2 ? (
        <p className="text-sm text-muted-foreground">Tape au moins 2 caractères.</p>
      ) : tokens.length === 0 && profiles.length === 0 ? (
        <p className="surface p-8 text-center text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
      ) : (
        <>
          {tokens.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Tokens</h2>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {tokens.map((t) => (
                  <li key={t.mint}>
                    <Link href={`/token/${t.mint}`} className="block">
                      <TokenCard name={t.name} ticker={t.ticker} imageUrl={t.image_url} marketCapSol={Number(t.market_cap_sol)} progress={Number(t.curve_progress)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {profiles.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Comptes</h2>
              <ul className="flex flex-wrap gap-2">
                {profiles.map((p) => (
                  <li key={p.wallet}>
                    <Link href={`/profil/${p.wallet}`} className="chip flex items-center gap-2 py-1 pl-1">
                      <Avatar wallet={p.wallet} pseudo={p.pseudo} url={p.avatar_url} size={24} />
                      {displayName(p)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
