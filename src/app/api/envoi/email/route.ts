import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionWallet } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/api";
import { privyServerReady, walletForEmail } from "@/lib/privy-server";
import { rateLimit, tooMany } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254) });

/**
 * Envoi par e-mail : renvoie l'adresse Solana du destinataire (créée à l'avance s'il n'a pas encore de compte).
 * Aucun argent ne passe par ici : l'envoi reste signé par l'expéditeur, directement vers ce wallet.
 */
export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Connecte-toi pour envoyer de l'argent.");
    // Limite anti-abus : on ne laisse pas deviner en masse les wallets associés à des e-mails
    if (!rateLimit(`envoi-email:${wallet}`, 10, 60 * 60_000)) return tooMany(60);
    if (!privyServerReady()) return jsonError(503, "L'envoi par e-mail n'est pas encore activé.");
    const { email } = schema.parse(await req.json());
    const { address, created } = await walletForEmail(email);
    return NextResponse.json({ address, created });
  } catch (err) {
    return handleApiError(err);
  }
}
