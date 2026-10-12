import { NextResponse, type NextRequest } from "next/server";
import { handleApiError } from "@/lib/api";
import { rateLimit, tooMany } from "@/lib/rate-limit";

type GiphyItem = { id: string; title: string; images: { fixed_width: { url: string; width: string; height: string }; original: { url: string } } };

/**
 * Recherche de GIF (Giphy, classés « PG-13 » au maximum), par la clé secrète du serveur.
 * Sans clé configurée, la page propose de coller un lien Giphy ou Tenor.
 */
export async function GET(req: NextRequest) {
  try {
    const key = process.env.GIPHY_API_KEY;
    if (!key) return NextResponse.json({ needKey: true, items: [] });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`gifs:${ip}`, 60, 60_000)) return tooMany(60);
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 50);
    const endpoint = q ? "search" : "trending";
    const params = new URLSearchParams({ api_key: key, limit: "24", rating: "pg-13", lang: "fr", ...(q ? { q } : {}) });
    const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params}`, { signal: AbortSignal.timeout(6000), next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ items: [] });
    const json = (await res.json()) as { data: GiphyItem[] };
    const items = json.data.map((g) => ({
      id: g.id,
      title: g.title,
      preview: g.images.fixed_width.url,
      // Lien média stable (sans paramètres de suivi)
      url: `https://media.giphy.com/media/${g.id}/giphy.gif`,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}
