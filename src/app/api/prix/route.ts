import { NextResponse } from "next/server";
import { getSolEur } from "@/lib/price";

/** Cours SOL/EUR pour l'affichage des montants en euros. */
export async function GET() {
  const solEur = await getSolEur();
  return NextResponse.json({ solEur }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
