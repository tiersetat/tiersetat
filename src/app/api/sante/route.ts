import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";
import { RPC_URL } from "@/lib/solana/config";

export const dynamic = "force-dynamic";

/** Mesure le temps de réponse d'un service (ms), ou null s'il ne répond pas en 5 s. */
async function timed(fn: () => Promise<unknown>): Promise<number | null> {
  const t = Date.now();
  try {
    await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error("délai")), 5000))]);
    return Date.now() - t;
  } catch {
    return null;
  }
}

/**
 * Contrôle de santé, pour les services d'alerte (Better Stack, UptimeRobot…) : base de données et blockchain.
 * 200 si tout répond, 503 sinon. Ne renvoie aucune donnée sensible.
 */
export async function GET() {
  const [base, blockchain] = await Promise.all([
    timed(async () => {
      const { error } = await supabasePublic().from("tokens").select("mint", { head: true, count: "exact" }).limit(1);
      if (error) throw error;
    }),
    timed(async () => {
      const res = await fetch(RPC_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }) });
      if (!res.ok) throw new Error(String(res.status));
    }),
  ]);
  const ok = base !== null && blockchain !== null;
  return NextResponse.json({ ok, base_ms: base, blockchain_ms: blockchain, at: new Date().toISOString() }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
