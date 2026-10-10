import { NextResponse } from "next/server";
import { itemsFor } from "@/lib/market-data";
import { isSolanaAddress } from "@/lib/radar-utils";

/** Fiches de marché pour une liste d'adresses (« Ma liste »). */
export async function GET(req: Request) {
  const mints = (new URL(req.url).searchParams.get("mints") ?? "").split(",").filter(isSolanaAddress).slice(0, 100);
  try {
    return NextResponse.json({ items: await itemsFor(mints) }, { headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ items: [] }, { status: 502 });
  }
}
