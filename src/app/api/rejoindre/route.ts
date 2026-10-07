import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api";
import { clientIp, rateLimit, tooMany } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getWaitlistCountFresh } from "@/lib/waitlist";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254),
  consent: z.literal(true, { message: "Coche la case pour accepter de recevoir l'e-mail du lancement." }),
  source: z.string().max(40).optional(),
  /** Piège à robots : champ invisible, doit rester vide */
  website: z.string().max(0).optional(),
});

/** Inscription à la liste d'attente du lancement (e-mail seul). */
export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`waitlist:${clientIp(req.headers)}`, 5, 10 * 60_000)) return tooMany(10);
    const { email, source } = schema.parse(await req.json());
    const { error } = await supabaseAdmin().from("waitlist").insert({ email, source: source ?? null });
    // Déjà inscrit : on répond comme un succès (ne révèle pas qui est inscrit)
    if (error && error.code !== "23505") throw error;
    return NextResponse.json({ ok: true, count: await getWaitlistCountFresh() });
  } catch (err) {
    return handleApiError(err);
  }
}
