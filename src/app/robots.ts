import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/solana/config";

/** Moteurs de recherche : pages publiques indexables, pas l'administration ni les API. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }], sitemap: `${SITE_URL}/sitemap.xml` };
}
