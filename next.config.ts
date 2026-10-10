import type { NextConfig } from "next";

/** En-têtes de sécurité appliqués à toutes les pages et routes API. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" }, // pas d'intégration du site dans une iframe (anti-clickjacking)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** Version 2 : l'appli se concentre sur le launchpad et le trading. Les anciennes pages renvoient vers l'essentiel. */
const RETIRED = ["/semaine", "/clans", "/cahiers", "/dette", "/assemblee", "/vision", "/manifeste", "/radar"];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...RETIRED.map((source) => ({ source, destination: "/", permanent: false })),
      { source: "/classements", destination: "/fil?vue=classement", permanent: false },
      { source: "/abonnements", destination: "/fil", permanent: false },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Le service worker doit toujours être relu, pour que les mises à jour arrivent sur les téléphones
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
