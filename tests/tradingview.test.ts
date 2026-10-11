import { describe, expect, it } from "vitest";
import { tvForCrypto, tvForMarket } from "@/lib/tradingview";

describe("symboles TradingView", () => {
  it("résout actions, indices et matières premières vers des symboles vérifiés", () => {
    expect(tvForMarket("TSLA")).toBe("NASDAQ:TSLA");
    expect(tvForMarket("SP500")).toBe("OANDA:SPX500USD");
    expect(tvForMarket("GOLD")).toBe("OANDA:XAUUSD");
  });
  it("renvoie null pour les pré-IPO (graphique en direct à la place)", () => {
    expect(tvForMarket("SPCX")).toBeNull();
    expect(tvForMarket("INCONNU")).toBeNull();
  });
  it("résout les cryptos, insensible à la casse", () => {
    expect(tvForCrypto("btc")).toMatch(/BTC/);
    expect(tvForCrypto("pas-une-crypto")).toBeNull();
  });
});
