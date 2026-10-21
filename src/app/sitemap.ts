import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/solana/config";

/** Pages publiques à proposer aux moteurs de recherche. */
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/partenaires", "/cgu", "/mentions-legales", "/confidentialite"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: p ? "monthly" : "daily", priority: p ? 0.5 : 1 }));
}
