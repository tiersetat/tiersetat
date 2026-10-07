import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { MissingEnvError } from "@/lib/env";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Traduit les erreurs courantes en réponses JSON françaises, sans fuite de détails internes. */
export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError(400, err.issues[0]?.message ?? "Requête invalide");
  }
  if (err instanceof MissingEnvError) {
    console.error(err.message);
    return jsonError(503, "Le serveur n'est pas encore configuré (Supabase / session).");
  }
  console.error(err);
  return jsonError(500, "Erreur interne, réessaie dans un instant.");
}
