import "server-only";

/** Variables d'environnement serveur. Ne jamais importer ce fichier côté client. */
export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Variable d'environnement manquante : ${name} (voir .env.example).`);
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingEnvError(name);
  return value;
}

export const serverEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY"),
  sessionSecret: () => required("SESSION_SECRET"),
};
