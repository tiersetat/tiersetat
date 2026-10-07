import { describe, expect, it } from "vitest";
import { assertDevnetRpc, DBC_PROGRAM_ID, explorerUrl } from "@/lib/solana/config";

describe("assertDevnetRpc", () => {
  it("accepte un RPC devnet", () => {
    expect(assertDevnetRpc("https://api.devnet.solana.com")).toBe(
      "https://api.devnet.solana.com",
    );
  });

  it("refuse tout RPC mainnet, quelle que soit la casse", () => {
    expect(() => assertDevnetRpc("https://api.mainnet-beta.solana.com")).toThrow();
    expect(() => assertDevnetRpc("https://MAINNET.helius-rpc.com/?api-key=x")).toThrow();
  });
});

describe("constantes", () => {
  it("pointe vers le programme Meteora DBC", () => {
    expect(DBC_PROGRAM_ID.toBase58()).toBe("dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN");
  });

  it("génère des liens explorer devnet", () => {
    expect(explorerUrl("tx", "abc")).toBe("https://solscan.io/tx/abc?cluster=devnet");
  });
});
