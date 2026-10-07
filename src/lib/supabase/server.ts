import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

let admin: SupabaseClient | null = null;

/**
 * Client Supabase avec la clé secrète : contourne la RLS.
 * Uniquement dans les routes API / composants serveur.
 */
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(serverEnv.supabaseUrl(), serverEnv.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
