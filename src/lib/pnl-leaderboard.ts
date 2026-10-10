import "server-only";
import { memo } from "@/lib/memo";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aggregateTraders, TOTAL_SUPPLY } from "@/lib/traders";
import { solUsd } from "@/lib/feed";

/** Classement des traders par gains (réalisés + latents au prix actuel), comme les grandes applis de trading. */
export type PnlRow = {
  wallet: string;
  pseudo: string | null;
  avatar_url: string | null;
  pnlUsd: number | null;
  pnlSol: number;
  /** Le mème qui lui a le plus rapporté */
  best: { mint: string; ticker: string; image_url: string; pnlUsd: number | null } | null;
};

export function topTradersByPnl(limit = 50): Promise<PnlRow[]> {
  return memo(`pnl:${limit}`, 30_000, async () => {
    const db = supabaseAdmin();
    const { data: trades } = await db
      .from("trades")
      .select("mint, trader_wallet, side, sol_amount, token_amount, price_sol, block_time, signature")
      .order("block_time", { ascending: false })
      .limit(20000);
    if (!trades?.length) return [];
    const mints = [...new Set(trades.map((t) => t.mint))];
    const { data: tokens } = await db.from("tokens").select("mint, ticker, image_url, market_cap_sol, hidden").in("mint", mints);
    const tokenBy = new Map((tokens ?? []).filter((t) => !t.hidden).map((t) => [t.mint, t]));
    const usd = await solUsd();

    const byWallet = new Map<string, { pnlSol: number; best: { mint: string; pnlSol: number } | null }>();
    for (const mint of mints) {
      const tok = tokenBy.get(mint);
      if (!tok) continue;
      for (const p of aggregateTraders(trades.filter((t) => t.mint === mint), Number(tok.market_cap_sol) / TOTAL_SUPPLY)) {
        const cur = byWallet.get(p.wallet) ?? { pnlSol: 0, best: null };
        cur.pnlSol += p.pnlSol;
        if (!cur.best || p.pnlSol > cur.best.pnlSol) cur.best = { mint, pnlSol: p.pnlSol };
        byWallet.set(p.wallet, cur);
      }
    }
    const ranked = [...byWallet.entries()].sort((a, b) => b[1].pnlSol - a[1].pnlSol).slice(0, limit);
    const { data: profiles } = await db.from("profiles").select("wallet, pseudo, avatar_url").in("wallet", ranked.map(([w]) => w));
    const prof = new Map((profiles ?? []).map((p) => [p.wallet, p]));
    const toUsd = (sol: number) => (usd === null ? null : sol * usd);
    return ranked.map(([wallet, r]) => {
      const tok = r.best ? tokenBy.get(r.best.mint) : undefined;
      return {
        wallet,
        pseudo: prof.get(wallet)?.pseudo ?? null,
        avatar_url: prof.get(wallet)?.avatar_url ?? null,
        pnlSol: r.pnlSol,
        pnlUsd: toUsd(r.pnlSol),
        best: tok && r.best ? { mint: tok.mint, ticker: tok.ticker, image_url: tok.image_url, pnlUsd: toUsd(r.best.pnlSol) } : null,
      };
    });
  });
}
