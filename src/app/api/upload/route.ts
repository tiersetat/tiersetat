import { NextResponse, type NextRequest } from "next/server";
import { getSessionWallet } from "@/lib/auth/session";
import { getBlockedWords } from "@/lib/blocked-words";
import { handleApiError, jsonError } from "@/lib/api";
import { sniffImageType } from "@/lib/image";
import { gatewayUrl, pinFile, pinJson } from "@/lib/ipfs";
import { moderate } from "@/lib/moderation";
import { IMAGE_MAX_BYTES, launchFieldsSchema } from "@/lib/validators";
import { rateLimit, tooMany } from "@/lib/rate-limit";

const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" } as const;

/**
 * Étape 1 du lancement : modération + upload de l'image et des métadonnées sur IPFS.
 * La clé Pinata ne quitte jamais le serveur.
 */
export async function POST(req: NextRequest) {
  try {
    const wallet = await getSessionWallet();
    if (!wallet) return jsonError(401, "Connecte ton wallet et signe pour entrer avant de frapper un mème.");
    if (!rateLimit(`upload:${wallet}`, 6, 10 * 60_000)) return tooMany(10);

    const form = await req.formData();
    const fields = launchFieldsSchema.parse({
      name: form.get("name") ?? "",
      ticker: form.get("ticker") ?? "",
      description: form.get("description") ?? undefined,
      twitter: form.get("twitter") ?? undefined,
      website: form.get("website") ?? undefined,
      source: form.get("source") ?? undefined,
    });

    const verdict = moderate([fields.name, fields.ticker, fields.description], await getBlockedWords());
    if (!verdict.ok) return jsonError(422, verdict.reason);

    const image = form.get("image");
    if (!(image instanceof Blob) || image.size === 0) return jsonError(400, "Ajoute une image à ton mème.");
    if (image.size > IMAGE_MAX_BYTES) return jsonError(413, "Image trop lourde (4 Mo max).");
    const bytes = new Uint8Array(await image.arrayBuffer());
    const type = sniffImageType(bytes);
    if (!type) return jsonError(415, "Format d'image non supporté (PNG, JPG, GIF ou WebP).");

    const slug = `${fields.ticker.toLowerCase()}-${Date.now()}`;
    const imageCid = await pinFile(new Blob([bytes], { type }), `${slug}.${EXT[type]}`);
    const imageUrl = gatewayUrl(imageCid);

    // Format de métadonnées standard (Metaplex / wallets)
    const metadata = {
      name: fields.name,
      symbol: fields.ticker,
      description: fields.description,
      image: imageUrl,
      ...(fields.website ? { external_url: fields.website } : {}),
      properties: { files: [{ uri: imageUrl, type }], category: "image" },
      extensions: {
        ...(fields.twitter ? { twitter: fields.twitter } : {}),
        ...(fields.website ? { website: fields.website } : {}),
      },
      createdOn: "Tiers-État (devnet)",
    };
    const metadataUri = gatewayUrl(await pinJson(metadata, `${slug}.json`));

    return NextResponse.json({ metadataUri, imageUrl, name: fields.name, ticker: fields.ticker });
  } catch (err) {
    return handleApiError(err);
  }
}
