/**
 * Indexeur Tiers-État : écoute en continu le programme pump.fun sur le réseau principal de Solana
 * (LECTURE SEULE : aucune transaction n'est jamais envoyée) et sert le marché en direct à l'appli.
 *
 *   GET /health                     état et compteurs
 *   GET /new?limit=50               derniers tokens créés
 *   GET /trending?window=5m|1h      tokens où il y a le plus de monde
 *   GET /token/:mint                un token
 *   WS  /stream                     créations et échanges en direct
 */
import http from "node:http";
import { WebSocketServer, WebSocket as WsClient } from "ws";
import { eventsFromLogs, PUMP_PROGRAM, type PumpEvent } from "./decode";
import { Market } from "./state";

const PORT = Number(process.env.PORT ?? 8787);
const WSS_URL = process.env.MAINNET_WSS_URL; // ex. wss://mainnet.helius-rpc.com/?api-key=…
const ALLOWED = (process.env.ALLOWED_ORIGINS ?? "https://tiersetat.vercel.app,http://localhost:3000,http://localhost:3100").split(",");
if (!WSS_URL) throw new Error("MAINNET_WSS_URL manquant");

const market = new Market();
const clients = new Set<WsClient>();

// --- Branchement sur la blockchain, avec reconnexion automatique -------------------------
function connect(attempt = 0) {
  const ws = new WebSocket(WSS_URL!);
  let ping: ReturnType<typeof setInterval> | null = null;
  ws.onopen = () => {
    console.log("branché sur Solana (pump.fun)");
    ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "logsSubscribe", params: [{ mentions: [PUMP_PROGRAM] }, { commitment: "processed" }] }));
    ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getHealth" })), 30_000);
    attempt = 0;
  };
  ws.onmessage = (msg) => {
    const value = JSON.parse(String(msg.data)).params?.result?.value;
    if (!value?.logs || value.err) return; // transactions échouées ignorées
    const now = Date.now();
    for (const e of eventsFromLogs(value.logs)) {
      market.apply(e, now);
      broadcast(e);
    }
  };
  ws.onclose = () => {
    if (ping) clearInterval(ping);
    const wait = Math.min(30_000, 1000 * 2 ** attempt);
    console.log(`connexion perdue, nouvel essai dans ${wait / 1000} s`);
    setTimeout(() => connect(attempt + 1), wait);
  };
  ws.onerror = () => ws.close();
}

// --- Diffusion en direct aux applis connectées (créations + gros échanges) ------------------
function broadcast(e: PumpEvent) {
  if (clients.size === 0) return;
  let payload: unknown = null;
  if (e.kind === "create") payload = { type: "create", mint: e.mint, name: e.name, symbol: e.symbol, uri: e.uri, at: Date.now() };
  else if (e.kind === "trade" && e.solAmount >= 0.5) payload = { type: "trade", mint: e.mint, sol: e.solAmount, buy: e.isBuy, mcapSol: e.priceSol * 1e9, at: Date.now() };
  else if (e.kind === "complete") payload = { type: "complete", mint: e.mint, at: Date.now() };
  if (!payload) return;
  const data = JSON.stringify(payload);
  for (const c of clients) if (c.readyState === WsClient.OPEN) c.send(data);
}

// --- API HTTP -------------------------------------------------------------------------------
function send(res: http.ServerResponse, origin: string | undefined, status: number, body: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (origin && ALLOWED.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  res.writeHead(status, headers).end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  const origin = req.headers.origin;
  if (url.pathname === "/health") return send(res, origin, 200, { ok: true, tokens: market.tokens.size, clients: clients.size, ...market.stats });
  if (url.pathname === "/new") return send(res, origin, 200, { items: market.newest(Math.min(100, Number(url.searchParams.get("limit") ?? 50))) });
  if (url.pathname === "/trending") {
    const w = url.searchParams.get("window") === "1h" ? 3_600_000 : 300_000;
    return send(res, origin, 200, { items: market.trending(w, 50) });
  }
  const m = url.pathname.match(/^\/token\/([1-9A-HJ-NP-Za-km-z]{32,44})$/);
  if (m) {
    const t = market.tokens.get(m[1]);
    return t ? send(res, origin, 200, market.summary(t, 3_600_000)) : send(res, origin, 404, { error: "inconnu" });
  }
  send(res, origin, 404, { error: "introuvable" });
});

const wss = new WebSocketServer({ server, path: "/stream" });
wss.on("connection", (c, req) => {
  if (req.headers.origin && !ALLOWED.includes(req.headers.origin)) return c.close();
  clients.add(c);
  c.on("close", () => clients.delete(c));
});

setInterval(() => market.prune(), 60_000);
server.listen(PORT, () => console.log(`indexeur sur le port ${PORT}`));
connect();
