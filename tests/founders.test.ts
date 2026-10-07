import { describe, expect, it } from "vitest";
import { computeFounders } from "@/lib/founders";

describe("computeFounders", () => {
  it("numérote par première action, une seule fois par compte", () => {
    const f = computeFounders([
      { wallet: "B", at: "2026-10-02T00:00:00Z" },
      { wallet: "A", at: "2026-10-03T00:00:00Z" },
      { wallet: "A", at: "2026-10-01T00:00:00Z" },
      { wallet: "C", at: "2026-10-04T00:00:00Z" },
    ]);
    expect([...f.entries()]).toEqual([["A", 1], ["B", 2], ["C", 3]]);
  });

  it("s'arrête au nombre de places", () => {
    const actions = Array.from({ length: 150 }, (_, i) => ({ wallet: `W${i}`, at: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString() }));
    const f = computeFounders(actions);
    expect(f.size).toBe(100);
    expect(f.get("W0")).toBe(1);
    expect(f.has("W120")).toBe(false);
  });
});
