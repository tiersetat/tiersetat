import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { canChangeClan, nextChangeDate } from "@/lib/clans";
import { supabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({ clan: z.string().regex(/^[a-z0-9-]{2,40}$/).nullable() });

/** Rejoindre / quitter un clan (changement limité à une fois par semaine). */
export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Connecte-toi pour rejoindre un clan.");
    const { clan } = schema.parse(await req.json());
    const db = supabaseAdmin();
    if (clan) {
      const { data: exists } = await db.from("clans").select("slug").eq("slug", clan).maybeSingle();
      if (!exists) return jsonError(404, "Clan inconnu.");
    }

    await db.from("profiles").upsert({ wallet }, { onConflict: "wallet", ignoreDuplicates: true });
    const { data: me, error: meErr } = await db.from("profiles").select("clan, clan_joined_at").eq("wallet", wallet).single();
    if (meErr) throw meErr;
    if (me.clan === clan) return NextResponse.json({ clan });
    if (me.clan && !canChangeClan(me.clan_joined_at)) {
      return jsonError(429, `Tu pourras changer de clan à partir du ${nextChangeDate(me.clan_joined_at).toLocaleDateString("fr-FR")}.`);
    }
    const { error } = await db
      .from("profiles")
      .update({ clan, clan_joined_at: clan ? new Date().toISOString() : me.clan_joined_at })
      .eq("wallet", wallet);
    if (error) throw error;
    return NextResponse.json({ clan });
  } catch (err) {
    return handleApiError(err);
  }
}
