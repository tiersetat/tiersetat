import { NextResponse } from "next/server";
import { getBuzz, isCountry, ofCountry } from "@/lib/buzz";

/** Actus agrégées d'un pays (`?pays=be`, France par défaut) (médias + r/france), mises en cache 10 minutes. */
export async function GET(req: Request) {
  const pays = new URL(req.url).searchParams.get("pays");
  const data = await getBuzz();
  return NextResponse.json({ ...data, items: ofCountry(data.items, isCountry(pays) ? pays : "fr") }, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" },
  });
}
