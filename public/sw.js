/* Tiers-État : service worker minimal.
 * Pas de cache des pages (les données doivent rester fraîches) : uniquement une page
 * « hors connexion » lisible quand le téléphone n'a plus de réseau. */
const OFFLINE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tiers-État — hors connexion</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#030206;color:#f4f1fa;font-family:-apple-system,sans-serif;text-align:center;padding:24px}p{color:#9b98ad}</style></head>
<body><div><h1>Pas de réseau</h1><p>Tiers-État a besoin d'une connexion pour lire la blockchain.<br>Reviens dès que tu es reconnecté.</p></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
  );
});
