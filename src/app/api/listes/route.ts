import { NextResponse } from "next/server";
import { loadList } from "@/lib/market-lists";
import { CATS, parseKey } from "@/lib/market-tabs";
import { isChain } from "@/lib/market-feeds";
import type { Category } from "@/lib/hyperliquid";

/** Listes de tokens pour le panneau « Tokens » (toutes les pages). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const key = parseKey(q.get("tri"));
  const chain = isChain(q.get("chaine")) ? (q.get("chaine") as Parameters<typeof loadList>[1]) : null;
  const cat = (CATS.some((c) => c.key === q.get("cat")) ? q.get("cat") : null) as Category | null;
  try {
    const items = await loadList(key, chain, cat);
    return NextResponse.json({ items: items ?? [] }, { headers: { "Cache-Control": key === "dexpaye" ? "public, s-maxage=8, stale-while-revalidate=20" : "public, s-maxage=20, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}
