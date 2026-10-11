import { TV_CRYPTOS, TV_MARKETS } from "./tradingview-symbols";

/** Marché Hyperliquid → symbole TradingView vérifié, ou null (graphique en direct à la place). */
export function tvForMarket(symbol: string): string | null {
  return TV_MARKETS[symbol] ?? null;
}

/** Crypto → paire de référence sur TradingView, ou null si TradingView ne la cote pas. */
export function tvForCrypto(symbol: string): string | null {
  return TV_CRYPTOS[symbol.toUpperCase()] ?? null;
}
