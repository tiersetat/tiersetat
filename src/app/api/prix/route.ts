import { NextResponse } from "next/server";
import { getSolEur, getUsdEur } from "@/lib/price";

/** Cours SOL/EUR et USD/EUR pour l'affichage des montants en euros. */
export async function GET() {
  const [solEur, usdEur] = await Promise.all([getSolEur(), getUsdEur()]);
  return NextResponse.json({ solEur, usdEur }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
