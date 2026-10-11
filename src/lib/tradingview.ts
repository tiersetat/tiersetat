/** Symboles TradingView des marchés de l'appli (null quand TradingView ne connaît pas l'actif, ex. pré-IPO). */
const SPECIAL: Record<string, string | null> = {
  // Indices et ETF
  XYZ100: "NASDAQ:NDX", USTECH: "NASDAQ:NDX", SP500: "SP:SPX", US500: "SP:SPX", SMALL2000: "TVC:RUT", JP225: "TVC:NI225", KR200: "KRX:KOSPI200",
  TOTAL2: "CRYPTOCAP:TOTAL2", OTHERS: "CRYPTOCAP:OTHERS", BTCD: "CRYPTOCAP:BTC.D", BVIV: null,
  SMH: "NASDAQ:SMH", SOXL: "AMEX:SOXL", XLE: "AMEX:XLE", XBI: "AMEX:XBI", IGV: "AMEX:IGV", MAGS: "NASDAQ:MAGS", EWY: "AMEX:EWY", EWJ: "AMEX:EWJ",
  EWZ: "AMEX:EWZ", EWT: "AMEX:EWT", URNM: "AMEX:URNM", KORU: "AMEX:KORU", DRAM: null,
  // Matières premières
  GOLD: "TVC:GOLD", SILVER: "TVC:SILVER", PLATINUM: "TVC:PLATINUM", PALLADIUM: "TVC:PALLADIUM", COPPER: "COMEX:HG1!",
  CL: "TVC:USOIL", BRENTOIL: "TVC:UKOIL", NATGAS: "NYMEX:NG1!", HO: "NYMEX:HO1!",
  // Forex et taux
  EUR: "FX:EURUSD", JPY: "FX:USDJPY", GBP: "FX:GBPUSD", TLT: "NASDAQ:TLT", USBOND: "CBOT:ZB1!", "10Y": "TVC:US10Y", "30Y": "TVC:US30Y", "2Y": "TVC:US02Y",
  // Actions hors États-Unis
  SMSN: "KRX:005930", SKHX: "KRX:000660", SKHY: "KRX:000660", SOFTBANK: "TSE:9984", HYUNDAI: "KRX:005380", KIOXIA: "TSE:285A", TCNT: "HKEX:700",
  UMC: "NYSE:UMC", GIGADEV: "SSE:603986", NOK: "NYSE:NOK", ASML: "NASDAQ:ASML", TSM: "NYSE:TSM", BABA: "NYSE:BABA",
  // Pré-IPO et marchés propres à Hyperliquid : pas de cours public
  SPCX: null, OAI: null, ANTH: null, SHEIN: null, MINIMAX: null, ZHIPU: null, UNITREE: null, CXMT: null, OURA: null, PURRDAT: null,
  ANSEM: null, TREAD: null, BOT: null, LYTE: null, NCLD: null, SNXX: null, QNT: null, SHAZ: null, STRC: "NASDAQ:STRC", KSTR: null, BIRD: "NASDAQ:BIRD",
};

/** Marché Hyperliquid → symbole TradingView. Les actions américaines se résolvent par leur ticker. */
export function tvForMarket(symbol: string, category: string): string | null {
  if (symbol in SPECIAL) return SPECIAL[symbol];
  if (category === "actions") return symbol;
  return null;
}

/** Crypto → paire de référence sur TradingView. */
export function tvForCrypto(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s === "BTC") return "BINANCE:BTCUSDT";
  return `CRYPTO:${s}USD`;
}
