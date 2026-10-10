import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TokenCard } from "@/components/brand/TokenCard";
import { Avatar } from "@/components/social/Avatar";
import { displayName } from "@/lib/display";
import { supabasePublic } from "@/lib/supabase/public";
import { solanaAddress } from "@/lib/validators";
import { searchRadar } from "@/lib/radar";
import { MarketRow, type MarketItem } from "@/components/market/MarketRow";

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

  // Une adresse Solana complète : notre mème, sinon un token Solana existant, sinon un profil
  if (solanaAddress.safeParse(query).success) {
    const { data } = await db.from("tokens").select("mint").eq("mint", query).maybeSingle();
    if (data) redirect(`/token/${query}`);
    const [ext] = await searchRadar(query).catch(() => []);
    redirect(ext ? `/marche/${query}` : `/profil/${query}`);
  }

  const q = sanitize(query);
  let tokens: FoundToken[] = [];
  let profiles: FoundProfile[] = [];
  let solana: MarketItem[] = [];
  if (q.length >= 2) {
    solana = (await searchRadar(q).catch(() => [])).map((t) => ({
      address: t.address,
      name: t.name,
      symbol: t.symbol,
      imageUrl: t.imageUrl,
      priceUsd: t.priceUsd,
      mcapUsd: t.mcapUsd,
      change24: t.change.h24,
    }));
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
        <h1 className="text-4xl font-extrabold">Recherche</h1>
        <form action="/recherche" className="flex max-w-xl gap-2">
          <input name="q" defaultValue={query} className="field" placeholder="Token, $TICKER, pseudo ou adresse" autoFocus aria-label="Rechercher" />
          <button type="submit" className="btn-primary shrink-0">
            Chercher
          </button>
        </form>
      </header>

      {q.length < 2 ? (
        <p className="text-sm text-muted-foreground">Tape au moins 2 caractères.</p>
      ) : tokens.length === 0 && profiles.length === 0 && solana.length === 0 ? (
        <p className="surface p-8 text-center text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
      ) : (
        <>
          {tokens.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-extrabold">Mèmes Tiers-État</h2>
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
          {solana.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-extrabold">Sur tout Solana</h2>
              <ul className="surface divide-y divide-ligne/60 p-1.5">
                {solana.map((t) => (
                  <MarketRow key={t.address} t={t} />
                ))}
              </ul>
            </section>
          )}
          {profiles.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-extrabold">Traders</h2>
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
