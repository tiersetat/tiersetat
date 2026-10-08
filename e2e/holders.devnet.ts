import { expect, it } from "vitest";

/** Lecture seule : détenteurs d'un mème migré (test Bastille) correctement étiquetés. */
it("étiquette le marché après migration et le créateur", async () => {
  const { getHolders } = await import("@/lib/holders");
  const holders = await getHolders({
    mint: "5z5999zuVkV5aPVfYkuAkazSi39RocGyochFCCDD6LFR",
    pool: "M8HgQPwDJRmGduu5DhgHQknoyqx59prrGwG2ZivdXq9",
    creator_wallet: "FQ3wJFGnUw1LV7HhjkgUxeYwXnSUkKBA5QqjpdpHw4tH",
  });
  console.log(holders?.map((h) => `${h.kind} ${h.pct.toFixed(2)} %`).join(" | "));
  expect(holders).not.toBeNull();
  expect(holders!.some((h) => h.kind === "marche")).toBe(true);
  expect(holders!.some((h) => h.kind === "createur")).toBe(true);
});
