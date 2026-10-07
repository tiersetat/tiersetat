import { NextResponse } from "next/server";
import { getBuzz } from "@/lib/buzz";

/** Actus françaises agrégées (médias + r/france), mises en cache 10 minutes. */
export async function GET() {
  const data = await getBuzz();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" },
  });
}
