import { describe, expect, it } from "vitest";
import { creatorTrust, isEarlyDump, soldPct, type CreatorToken } from "@/lib/creator-trust";

const t0 = "2026-10-01T00:00:00Z";
const at = (h: number) => new Date(Date.parse(t0) + h * 3_600_000).toISOString();
const token = (trades: CreatorToken["trades"], migrated = false): CreatorToken => ({ mint: Math.random().toString(), created_at: t0, migrated, trades });

describe("soldPct", () => {
  it("part revendue", () => {
    expect(soldPct([{ side: "buy", token_amount: 100 }, { side: "sell", token_amount: 25 }])).toBe(25);
    expect(soldPct([{ side: "sell", token_amount: 10 }])).toBeNull();
  });
});

describe("isEarlyDump", () => {
  it("revente ≥ 50 % sous 24 h", () => {
    expect(isEarlyDump(token([{ side: "buy", token_amount: 100, block_time: at(0) }, { side: "sell", token_amount: 60, block_time: at(2) }]))).toBe(true);
  });
  it("revente tardive : pas un dump", () => {
    expect(isEarlyDump(token([{ side: "buy", token_amount: 100, block_time: at(0) }, { side: "sell", token_amount: 100, block_time: at(72) }]))).toBe(false);
  });
});

describe("creatorTrust", () => {
  const clean = token([{ side: "buy", token_amount: 100, block_time: at(0) }], true);
  const dump = token([{ side: "buy", token_amount: 100, block_time: at(0) }, { side: "sell", token_amount: 90, block_time: at(1) }]);

  it("niveaux", () => {
    expect(creatorTrust([]).niveau).toBe("nouveau");
    expect(creatorTrust([clean]).niveau).toBe("fiable");
    expect(creatorTrust([clean]).detail).toContain("Bastille");
    expect(creatorTrust([dump, clean]).niveau).toBe("risque");
    expect(creatorTrust([dump, clean, clean, clean]).niveau).toBe("mitige");
  });
});
