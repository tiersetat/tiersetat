import type { MetadataRoute } from "next";

/** Application installable (écran d'accueil iPhone / Android), sans passer par les stores. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tiers-État — Le launchpad des mèmes français",
    short_name: "Tiers-État",
    description: "Transforme un mème ou une actu en token, en une signature. Le peuple frappe sa monnaie.",
    lang: "fr",
    start_url: "/?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#030206",
    theme_color: "#030206",
    categories: ["finance", "social", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Créer un token", url: "/lancer", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Ça buzz", url: "/ca-buzz", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Radar", url: "/radar", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
