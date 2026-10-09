import "server-only";
import { sendPush, throttled } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/server";

type TokenInfo = { mint: string; name: string; ticker: string; creator_wallet: string };
type TradeInfo = { trader: string; side: "buy" | "sell"; solAmount: number };

const sol = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });

async function buyersOf(mint: string, except: string): Promise<string[]> {
  const { data } = await supabaseAdmin().from("trades").select("trader_wallet").eq("mint", mint).eq("side", "buy").neq("trader_wallet", except).limit(2000);
  return [...new Set((data ?? []).map((t) => t.trader_wallet as string))];
}

/**
 * Alertes déclenchées par un échange : prise de la Bastille, vente du créateur, nouvel achat.
 * Ne bloque jamais l'enregistrement de l'échange (erreurs ignorées, délai borné).
 */
export async function notifyTradeEvents(token: TokenInfo, trade: TradeInfo | null, curveJustCompleted: boolean): Promise<void> {
  const url = `/token/${token.mint}`;
  const jobs: Promise<unknown>[] = [];

  if (curveJustCompleted && !throttled(`bastille:${token.mint}`, 3_600_000)) {
    const wallets = [token.creator_wallet, ...(await buyersOf(token.mint, token.creator_wallet))];
    jobs.push(sendPush(wallets, { title: `$${token.ticker} a pris la Bastille`, body: `${token.name} a rempli sa courbe et part sur le marché, liquidité bloquée à vie.`, url, tag: `bastille-${token.mint}` }));
  }

  if (trade?.side === "sell" && trade.trader === token.creator_wallet && !throttled(`creator-sold:${token.mint}`, 600_000)) {
    jobs.push(
      buyersOf(token.mint, token.creator_wallet).then((wallets) =>
        sendPush(wallets, { title: `Le créateur de $${token.ticker} vient de vendre`, body: `Il a revendu pour ${sol(trade.solAmount)} SOL. Consulte la page du mème.`, url, tag: `sold-${token.mint}` }),
      ),
    );
  }

  if (trade?.side === "buy" && trade.trader !== token.creator_wallet && !throttled(`buy:${token.mint}`, 600_000)) {
    jobs.push(sendPush([token.creator_wallet], { title: `Nouvel achat sur $${token.ticker}`, body: `Quelqu'un vient d'acheter ton mème pour ${sol(trade.solAmount)} SOL.`, url, tag: `buy-${token.mint}` }));
  }

  if (jobs.length === 0) return;
  await Promise.race([Promise.allSettled(jobs), new Promise((r) => setTimeout(r, 4000))]);
}
