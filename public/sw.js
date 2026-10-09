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

// Notifications sur téléphone : affichage et ouverture de la bonne page au toucher
self.addEventListener("push", (event) => {
  let data = { title: "Tiers-État", body: "", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* charge utile illisible : notification générique */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, { body: data.body, icon: "/icon-192.png", badge: "/icon-192.png", tag: data.tag, data: { url: data.url } }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((w) => w && w.focus());
      return self.clients.openWindow(url);
    }),
  );
});
