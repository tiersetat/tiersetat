import "server-only";
import { memo } from "@/lib/memo";
import { supabasePublic } from "@/lib/supabase/public";

/** Nombre d'inscrits à la liste d'attente (null si la table n'existe pas encore). */
export function getWaitlistCount(): Promise<number | null> {
  return memo("waitlist", 20_000, async () => {
    const { data, error } = await supabasePublic().rpc("waitlist_count");
    return error ? null : Number(data);
  });
}

/** Compteur à jour juste après une inscription (sans cache). */
export async function getWaitlistCountFresh(): Promise<number | null> {
  const { data, error } = await supabasePublic().rpc("waitlist_count");
  return error ? null : Number(data);
}
