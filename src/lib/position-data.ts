import "server-only";
import { buildPosition, type Position, type PositionTrade } from "@/lib/position";
import { PLATFORM_CURVE } from "@/lib/solana/platform";
import { supabasePublic } from "@/lib/supabase/public";

export type PositionData = {
  token: { mint: string; name: string; ticker: string; image_url: string; market_cap_sol: number };
  trader: { wallet: string; pseudo: string | null; avatar_url: string | null };
  position: Position;
  priceSol: number;
};

/** Position d'un wallet sur un token, d'après les trades indexés (null si token masqué/inconnu ou aucun trade). */
export async function getPositionData(mint: string, wallet: string): Promise<PositionData | null> {
  const db = supabasePublic();
  const [{ data: token }, { data: trades }, { data: profile }] = await Promise.all([
    db.from("tokens").select("mint, name, ticker, image_url, market_cap_sol").eq("mint", mint).maybeSingle<PositionData["token"]>(),
    db
      .from("trades")
      .select("side, sol_amount, token_amount, price_sol, block_time, signature")
      .eq("mint", mint)
      .eq("trader_wallet", wallet)
      .order("block_time", { ascending: true })
      .limit(500)
      .returns<PositionTrade[]>(),
    db.from("profiles").select("pseudo, avatar_url").eq("wallet", wallet).maybeSingle<{ pseudo: string | null; avatar_url: string | null }>(),
  ]);
  if (!token || !trades?.length) return null;
  // Prix spot ≈ market cap / offre totale
  const priceSol = Number(token.market_cap_sol) / PLATFORM_CURVE.totalSupply;
  return {
    token,
    trader: { wallet, pseudo: profile?.pseudo ?? null, avatar_url: profile?.avatar_url ?? null },
    position: buildPosition(trades, priceSol),
    priceSol,
  };
}
