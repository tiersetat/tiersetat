import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearMemo, memo } from "@/lib/memo";

describe("memo", () => {
  beforeEach(() => clearMemo());

  it("regroupe les appels simultanés et met en cache", async () => {
    const fn = vi.fn(async () => 42);
    const [a, b] = await Promise.all([memo("k", 1000, fn), memo("k", 1000, fn)]);
    expect([a, b]).toEqual([42, 42]);
    expect(await memo("k", 1000, fn)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("expire après le délai", async () => {
    vi.useFakeTimers();
    const fn = vi.fn(async () => Date.now());
    await memo("t", 1000, fn);
    vi.advanceTimersByTime(1500);
    await memo("t", 1000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("ne met pas une erreur en cache", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("panne")).mockResolvedValueOnce("ok");
    await expect(memo("e", 1000, fn)).rejects.toThrow("panne");
    expect(await memo("e", 1000, fn)).toBe("ok");
  });
});
