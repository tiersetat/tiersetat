/**
 * Graphiques en direct, transaction par transaction : le navigateur écoute lui-même la blockchain Solana
 * (websocket Helius) au lieu d'attendre un service de données.
 *
 * LECTURE SEULE. Les memecoins du marché vivent sur le mainnet : cette connexion sert uniquement
 * à lire les prix pour les graphiques. Elle est séparée du RPC des transactions (RPC_URL, verrouillé
 * sur le devnet par assertDevnetRpc) et n'envoie jamais rien d'autre que des abonnements en lecture.
 *
 * Trois méthodes, vérifiées sur de vrais échanges (octobre 2026) :
 *  - pump.fun (courbe, payée en SOL) : prix exact tiré des réserves virtuelles de la courbe, volume = variation des SOL réels ;
 *  - PumpSwap (payé en SOL) : prix réellement payé = variation des deux coffres dans le même bloc
 *    (le simple rapport des coffres ne donne PAS le prix chez PumpSwap : écart de 10 à 160 % mesuré) ;
 *  - autres DEX : chaque transaction sur le pool déclenche aussitôt une lecture du prix (Jupiter).
 */

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMPSWAP_PROGRAM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";

/** Un échange vu en direct : prix d'un token en SOL et volume en SOL (0 si inconnu). */
export type Tick = { priceSol: number; volumeSol: number };

/**
 * Adresse websocket de lecture du mainnet : NEXT_PUBLIC_MAINNET_DATA_RPC_URL si elle est définie,
 * sinon la même clé Helius que le site, sur le serveur mainnet (les clés Helius valent pour tous les réseaux).
 */
export function marketDataWsUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_MAINNET_DATA_RPC_URL;
  const base = explicit || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "";
  const http = explicit ? base : base.includes("devnet.helius-rpc.com") ? base.replace("devnet.helius-rpc.com", "mainnet.helius-rpc.com") : "";
  return http ? http.replace(/^http/, "ws") : null;
}

const toBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const u64 = (v: DataView, o: number) => Number(v.getBigUint64(o, true));

/** Courbe pump.fun : prix d'un token en SOL (tokens à 6 décimales), SOL réels déposés, courbe terminée. */
export function decodePumpCurve(data: Uint8Array): { priceSol: number; realSol: number; complete: boolean } | null {
  if (data.length < 49) return null;
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const vTok = u64(v, 8);
  const vSol = u64(v, 16);
  if (vTok <= 0) return null;
  return { priceSol: vSol / 1e9 / (vTok / 1e6), realSol: u64(v, 32) / 1e9, complete: data[48] === 1 };
}

/** Pool PumpSwap : jeton échangé, monnaie de paiement et leurs deux coffres (offsets vérifiés contre DexScreener). */
export function decodePumpSwapPool(data: Uint8Array): { baseMint: Uint8Array; quoteMint: Uint8Array; baseVault: Uint8Array; quoteVault: Uint8Array } | null {
  if (data.length < 203) return null;
  return { baseMint: data.subarray(43, 75), quoteMint: data.subarray(75, 107), baseVault: data.subarray(139, 171), quoteVault: data.subarray(171, 203) };
}

/**
 * Associe les variations des deux coffres d'un pool survenues dans le même bloc :
 * un échange fait monter l'un et baisser l'autre ; le rapport des deux variations est le prix payé.
 * Un ajout ou un retrait de liquidité (les deux dans le même sens) est ignoré.
 */
export class VaultPairer {
  private last: { base: number | null; quote: number | null } = { base: null, quote: null };
  private bySlot = new Map<number, { db?: number; dq?: number }>();
  private lastPrice: number | null = null;

  /** Montants de départ (lus une fois à l'ouverture). */
  seed(base: number, quote: number) {
    this.last = { base, quote };
  }

  /** Nouveau solde d'un coffre ; renvoie l'échange reconstitué quand les deux coffres du bloc sont connus. */
  feed(side: "base" | "quote", slot: number, amount: number): Tick | null {
    const prev = this.last[side];
    this.last[side] = amount;
    if (prev === null) return null;
    const entry = this.bySlot.get(slot) ?? {};
    if (side === "base") entry.db = (entry.db ?? 0) + (amount - prev);
    else entry.dq = (entry.dq ?? 0) + (amount - prev);
    this.bySlot.set(slot, entry);
    for (const s of this.bySlot.keys()) if (s < slot - 8) this.bySlot.delete(s);
    if (entry.db === undefined || entry.dq === undefined) return null;
    this.bySlot.delete(slot);
    const { db, dq } = entry;
    // Échange = sens opposés ; montants trop petits = arrondis (deux échanges contraires dans le même bloc)
    if (db === 0 || dq === 0 || Math.sign(db) === Math.sign(dq) || Math.abs(dq) < 1e-6) return null;
    const price = Math.abs(dq / db);
    // Garde-fou : un rapport aberrant (échanges croisés dans un même bloc) n'est pas affiché
    if (this.lastPrice !== null && (price > this.lastPrice * 5 || price < this.lastPrice / 5)) return null;
    this.lastPrice = price;
    return { priceSol: price, volumeSol: Math.abs(dq) };
  }
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Encodage base58 d'une clé publique (32 octets), sans dépendance. */
export function base58(bytes: Uint8Array): string {
  let n = BigInt(0);
  for (const b of bytes) n = n * BigInt(256) + BigInt(b);
  let out = "";
  while (n > BigInt(0)) {
    out = B58[Number(n % BigInt(58))] + out;
    n /= BigInt(58);
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

type Notify = (value: unknown, slot: number) => void;
type Sub = { method: string; params: unknown[]; cb: Notify; sub?: number };

/**
 * Petit client JSON-RPC websocket (abonnements seulement) : se reconnecte tout seul,
 * se met en pause quand l'onglet est caché (aucune consommation inutile), et relance les abonnements.
 */
export class RpcStream {
  private ws: WebSocket | null = null;
  private id = 0;
  private subs: Sub[] = [];
  private pending = new Map<number, number>();
  private closed = false;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;

  constructor(
    private url: string,
    private onLive: (on: boolean) => void,
  ) {
    document.addEventListener("visibilitychange", this.onVisibility);
    if (!document.hidden) this.open();
  }

  subscribe(method: string, params: unknown[], cb: Notify) {
    const s: Sub = { method, params, cb };
    this.subs.push(s);
    if (this.ws?.readyState === WebSocket.OPEN) this.send(s);
  }

  close() {
    this.closed = true;
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.shutdown();
  }

  private onVisibility = () => {
    if (this.closed) return;
    if (document.hidden) this.shutdown();
    else if (!this.ws) this.open();
  };

  private send(s: Sub) {
    const id = ++this.id;
    this.pending.set(id, this.subs.indexOf(s));
    this.ws?.send(JSON.stringify({ jsonrpc: "2.0", id, method: s.method, params: s.params }));
  }

  private open() {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      for (const s of this.subs) this.send(s);
      this.ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ jsonrpc: "2.0", id: ++this.id, method: "getHealth" })), 30_000);
    };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data as string) as { id?: number; result?: unknown; method?: string; params?: { subscription: number; result: { context: { slot: number }; value: unknown } } };
      if (m.id !== undefined && this.pending.has(m.id)) {
        const s = this.subs[this.pending.get(m.id)!];
        this.pending.delete(m.id);
        if (s && typeof m.result === "number") {
          s.sub = m.result;
          this.onLive(true);
        }
        return;
      }
      if (m.params) {
        const s = this.subs.find((x) => x.sub === m.params!.subscription);
        s?.cb(m.params.result.value, m.params.result.context.slot);
      }
    };
    ws.onclose = () => {
      if (this.ping) clearInterval(this.ping);
      this.ping = null;
      for (const s of this.subs) s.sub = undefined;
      if (this.ws === ws) this.ws = null;
      this.onLive(false);
      if (!this.closed && !document.hidden) this.retry = setTimeout(() => this.open(), 3000);
    };
    ws.onerror = () => ws.close();
  }

  private shutdown() {
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    const ws = this.ws;
    this.ws = null;
    ws?.close();
  }
}

/** Lecture ponctuelle (HTTP) de comptes, encodés en base64 ou analysés (jsonParsed). */
async function getAccounts(wsUrl: string, keys: string[], encoding: "base64" | "jsonParsed"): Promise<({ data: unknown; owner: string } | null)[]> {
  const res = await fetch(wsUrl.replace(/^ws/, "http"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [keys, { encoding, commitment: "confirmed" }] }),
  });
  const j = (await res.json()) as { result?: { value: ({ data: unknown; owner: string } | null)[] } };
  return j.result?.value ?? keys.map(() => null);
}

const tokenAmount = (parsed: unknown): number | null => {
  const t = (parsed as { parsed?: { info?: { tokenAmount?: { amount: string; decimals: number } } } })?.parsed?.info?.tokenAmount;
  return t ? Number(t.amount) / 10 ** t.decimals : null;
};

/**
 * Suit un marché Solana en direct. `dex` et `quote` viennent de DexScreener (dexId, adresse de la monnaie de paiement).
 * `onTick` reçoit chaque échange (prix en SOL) ; `onPing` signale une transaction dont le prix doit être relu ailleurs.
 * Renvoie la fonction d'arrêt, ou null si l'écoute directe est impossible (pas de websocket configuré).
 */
export function watchSolanaMarket(opts: {
  pair: string;
  dex?: string;
  quote?: string;
  onTick: (t: Tick) => void;
  onPing: () => void;
  onLive: (on: boolean, mode: "transactions" | "signal") => void;
}): (() => void) | null {
  const url = marketDataWsUrl();
  if (!url || typeof WebSocket === "undefined") return null;
  const paidInSol = !opts.quote || opts.quote === SOL_MINT;
  let stop = false;

  // pump.fun (payé en SOL) : la courbe elle-même
  if (opts.dex === "pumpfun" && paidInSol) {
    const rpc = new RpcStream(url, (on) => opts.onLive(on, "transactions"));
    let lastReal: number | null = null;
    rpc.subscribe("accountSubscribe", [opts.pair, { encoding: "base64", commitment: "confirmed" }], (value) => {
      const data = (value as { data?: [string, string] })?.data;
      const c = data ? decodePumpCurve(toBytes(data[0])) : null;
      if (!c || stop) return;
      const vol = lastReal === null ? 0 : Math.abs(c.realSol - lastReal);
      lastReal = c.realSol;
      opts.onTick({ priceSol: c.priceSol, volumeSol: vol });
    });
    return () => {
      stop = true;
      rpc.close();
    };
  }

  // PumpSwap (payé en SOL) : les deux coffres du pool, lus une fois puis suivis
  if (opts.dex === "pumpswap" && paidInSol) {
    let mode: "transactions" | "signal" = "transactions";
    const rpc = new RpcStream(url, (on) => opts.onLive(on, mode));
    const pairer = new VaultPairer();
    void (async () => {
      try {
        const [pool] = await getAccounts(url, [opts.pair], "base64");
        const raw = (pool?.data as [string, string] | undefined)?.[0];
        const p = raw && pool?.owner === PUMPSWAP_PROGRAM ? decodePumpSwapPool(toBytes(raw)) : null;
        if (!p || base58(p.quoteMint) !== SOL_MINT || stop) throw new Error("pool illisible");
        const baseVault = base58(p.baseVault);
        const quoteVault = base58(p.quoteVault);
        const [b, q] = await getAccounts(url, [baseVault, quoteVault], "jsonParsed");
        const b0 = tokenAmount(b?.data);
        const q0 = tokenAmount(q?.data);
        if (b0 !== null && q0 !== null) pairer.seed(b0, q0);
        for (const [side, key] of [["base", baseVault], ["quote", quoteVault]] as const) {
          rpc.subscribe("accountSubscribe", [key, { encoding: "jsonParsed", commitment: "confirmed" }], (value, slot) => {
            const amount = tokenAmount((value as { data?: unknown })?.data);
            if (amount === null || stop) return;
            const t = pairer.feed(side, slot, amount);
            if (t) opts.onTick(t);
          });
        }
      } catch {
        // Pool d'un format inattendu : on se rabat sur le signal de transaction
        mode = "signal";
        if (!stop) rpc.subscribe("logsSubscribe", [{ mentions: [opts.pair] }, { commitment: "confirmed" }], (v) => !(v as { err?: unknown })?.err && opts.onPing());
      }
    })();
    return () => {
      stop = true;
      rpc.close();
    };
  }

  // Autres DEX : chaque transaction réussie sur le pool déclenche une relecture du prix
  const rpc = new RpcStream(url, (on) => opts.onLive(on, "signal"));
  rpc.subscribe("logsSubscribe", [{ mentions: [opts.pair] }, { commitment: "confirmed" }], (v) => {
    if (!stop && !(v as { err?: unknown })?.err) opts.onPing();
  });
  return () => {
    stop = true;
    rpc.close();
  };
}
