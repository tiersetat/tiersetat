import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

let cache: { words: string[]; at: number } | null = null;
const TTL_MS = 60_000;

/** Liste des mots bloqués (table serveur uniquement), mise en cache 1 minute. */
export async function getBlockedWords(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.words;
  const { data, error } = await supabaseAdmin().from("blocked_words").select("word");
  if (error) throw error;
  cache = { words: (data ?? []).map((r) => r.word as string), at: Date.now() };
  return cache.words;
}

export function clearBlockedWordsCache() {
  cache = null;
}
