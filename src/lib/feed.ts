import "server-only";
import { memo } from "@/lib/memo";
import { majorsRadar } from "@/lib/radar";
import { supabasePublic } from "@/lib/supabase/public";
import { aggregateTraders, TOTAL_SUPPLY } from "@/lib/traders";

/** Fil social : les échanges et les thèses de la communauté, du plus récent au plus ancien. */

export type FeedToken = { mint: string; name: string; ticker: string; image_url: string };
export type FeedAuthor = { wallet: string; pseudo: string | null; avatar_url: string | null; clan?: string | null; country?: string | null };

export type FeedItem =
  | { kind: "trade"; id: string; at: string; author: FeedAuthor; token: FeedToken; side: "buy" | "sell"; usd: number | null; mcapUsd: number | null }
  | {
      kind: "these" | "commentaire";
      id: string;
      at: string;
      author: FeedAuthor;
      token: FeedToken;
      body: string;
      /** Position actuelle de l'auteur sur ce token (thèse uniquement) */
      position: { valueUsd: number | null; pnlUsd: number | null; pnlPct: number | null; closed: boolean } | null;
    };

export type FeedFilter = { type: "tout" | "echanges" | "theses"; minUsd: number; wallets: string[] | null };

type TradeRow = {
  signature: string;
  mint: string;
  trader_wallet: string;
  side: "buy" | "sell";
  sol_amount: number;
  token_amount: number;
  price_sol: number;
  block_time: string;
  tokens: (FeedToken & { market_cap_sol: number; hidden: boolean }) | null;
  profiles: { pseudo: string | null; avatar_url: string | null; clan?: string | null; country?: string | null } | null;
};
type CommentRow = {
  id: number;
  mint: string;
  author_wallet: string;
  body: string;
  created_at: string;
  tokens: (FeedToken & { market_cap_sol: number; hidden: boolean }) | null;
  profiles: { pseudo: string | null; avatar_url: string | null } | null;
};

/** Cours du SOL en dollars : les montants du fil s'affichent en $, comme dans les applis de trading. */
export function solUsd(): Promise<number | null> {
  return memo("feed:solusd", 60_000, async () => {
    const [sol] = await majorsRadar().catch(() => []);
    return sol?.priceUsd ?? null;
  });
}

const author = (wallet: string, p: { pseudo: string | null; avatar_url: string | null; clan?: string | null; country?: string | null } | null): FeedAuthor => ({
  wallet,
  pseudo: p?.pseudo ?? null,
  avatar_url: p?.avatar_url ?? null,
  clan: p?.clan ?? null,
  country: p?.country ?? null,
});
const token = (t: FeedToken): FeedToken => ({ mint: t.mint, name: t.name, ticker: t.ticker, image_url: t.image_url });

export async function getFeed(filter: FeedFilter): Promise<FeedItem[]> {
  const db = supabasePublic();
  const usd = await solUsd();
  const toUsd = (sol: number) => (usd === null ? null : sol * usd);

  const wantTrades = filter.type !== "theses";
  const wantTheses = filter.type !== "echanges";
  const tradesQuery = (profileCols: string) => {
    const q = db
      .from("trades")
      .select(`signature, mint, trader_wallet, side, sol_amount, token_amount, price_sol, block_time, tokens(mint, name, ticker, image_url, market_cap_sol, hidden), profiles(${profileCols})`)
      .order("block_time", { ascending: false })
      .limit(150);
    if (filter.wallets) q.in("trader_wallet", filter.wallets);
    return q;
  };
  // Le pays du trader (carte « Le monde qui trade ») : colonne récente, on s'en passe si la base ne l'a pas encore
  const loadTrades = async () => {
    const withCountry = await tradesQuery("pseudo, avatar_url, clan, country");
    return withCountry.error ? tradesQuery("pseudo, avatar_url, clan") : withCountry;
  };
  const commentsQ = db
    .from("comments")
    .select("id, mint, author_wallet, body, created_at, tokens(mint, name, ticker, image_url, market_cap_sol, hidden), profiles!comments_author_wallet_fkey(pseudo, avatar_url)")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(80);
  if (filter.wallets) commentsQ.in("author_wallet", filter.wallets);
  const [{ data: trades }, { data: comments }] = await Promise.all([
    wantTrades ? loadTrades() : Promise.resolve({ data: [] }),
    wantTheses ? commentsQ : Promise.resolve({ data: [] }),
  ]);

  const items: FeedItem[] = [];
  for (const t of (trades ?? []) as unknown as TradeRow[]) {
    if (!t.tokens || t.tokens.hidden) continue;
    const value = toUsd(Number(t.sol_amount));
    if (filter.minUsd > 0 && (value === null || value < filter.minUsd)) continue;
    items.push({
      kind: "trade",
      id: t.signature,
      at: t.block_time,
      author: author(t.trader_wallet, t.profiles),
      token: token(t.tokens),
      side: t.side,
      usd: value,
      mcapUsd: toUsd(Number(t.price_sol) * TOTAL_SUPPLY),
    });
  }

  // Thèses : le message d'un détenteur, affiché avec sa position actuelle
  const rows = ((comments ?? []) as unknown as CommentRow[]).filter((c) => c.tokens && !c.tokens.hidden);
  if (rows.length) {
    const { data: theirTrades } = await db
      .from("trades")
      .select("mint, trader_wallet, side, sol_amount, token_amount, price_sol, block_time, signature")
      .in("trader_wallet", [...new Set(rows.map((c) => c.author_wallet))])
      .in("mint", [...new Set(rows.map((c) => c.mint))])
      .limit(5000);
    const positions = new Map<string, ReturnType<typeof aggregateTraders>[number]>();
    const byMint = new Map<string, NonNullable<typeof theirTrades>>();
    for (const t of theirTrades ?? []) byMint.set(t.mint, [...(byMint.get(t.mint) ?? []), t]);
    for (const c of rows) {
      const price = Number(c.tokens!.market_cap_sol) / TOTAL_SUPPLY;
      for (const p of aggregateTraders(byMint.get(c.mint) ?? [], price)) positions.set(`${c.mint}:${p.wallet}`, p);
    }
    for (const c of rows) {
      const p = positions.get(`${c.mint}:${c.author_wallet}`);
      if (filter.type === "theses" && !p) continue;
      items.push({
        kind: p ? "these" : "commentaire",
        id: `c${c.id}`,
        at: c.created_at,
        author: author(c.author_wallet, c.profiles),
        token: token(c.tokens!),
        body: c.body,
        position: p ? { valueUsd: toUsd(p.valueSol), pnlUsd: toUsd(p.pnlSol), pnlPct: p.pnlPct, closed: p.closed } : null,
      });
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 120);
}
