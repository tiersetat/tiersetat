import type { CreateEvent, PumpEvent, TradeEvent } from "./decode";

/** État en mémoire de chaque token suivi : de quoi afficher les nouveaux tokens et les tendances en direct. */
export type TokenState = {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  creator: string;
  createdAt: number | null; // ms ; null si le token existait avant le démarrage de l'indexeur
  priceSol: number;
  lastTradeAt: number;
  complete: boolean; // courbe remplie : migré vers PumpSwap
  trades: { t: number; sol: number; buy: boolean; user: string }[]; // échanges de la dernière heure
};

const HOUR = 3_600_000;
const MAX_TOKENS = 30_000;

export class Market {
  tokens = new Map<string, TokenState>();
  createdOrder: string[] = []; // mints dans l'ordre de création, du plus récent au plus ancien
  stats = { events: 0, creates: 0, trades: 0, skipped: 0, startedAt: Date.now() };

  apply(e: PumpEvent, now = Date.now()) {
    this.stats.events++;
    if (e.kind === "create") return this.onCreate(e, now);
    if (e.kind === "trade") return this.onTrade(e, now);
    const t = this.tokens.get(e.mint);
    if (t) t.complete = true;
  }

  private onCreate(e: CreateEvent, now: number) {
    this.stats.creates++;
    const cur = this.tokens.get(e.mint);
    this.tokens.set(e.mint, {
      mint: e.mint,
      name: e.name,
      symbol: e.symbol,
      uri: e.uri,
      creator: e.creator,
      createdAt: now,
      // Prix de départ plausible seulement (capitalisation de lancement pump.fun : quelques dizaines de SOL)
      priceSol: cur?.priceSol || (e.priceSol * 1e9 > 5 && e.priceSol * 1e9 < 200 ? e.priceSol : 0),
      lastTradeAt: cur?.lastTradeAt ?? now,
      complete: false,
      trades: cur?.trades ?? [],
    });
    this.createdOrder.unshift(e.mint);
    if (this.createdOrder.length > 2000) this.createdOrder.length = 2000;
  }

  private onTrade(e: TradeEvent, now: number) {
    // Échanges contre une autre monnaie que le SOL (nouvelles instructions de pump.fun) : écartés pour l'instant
    if (e.solAmount <= 0 || e.priceSol <= 0) {
      this.stats.skipped++;
      return;
    }
    this.stats.trades++;
    let t = this.tokens.get(e.mint);
    if (!t) {
      // Token créé avant le démarrage : on le suit quand même, son nom viendra plus tard
      t = { mint: e.mint, name: "", symbol: "", uri: "", creator: "", createdAt: null, priceSol: 0, lastTradeAt: now, complete: false, trades: [] };
      this.tokens.set(e.mint, t);
    }
    t.priceSol = e.priceSol;
    t.lastTradeAt = now;
    t.trades.push({ t: now, sol: e.solAmount, buy: e.isBuy, user: e.user });
    if (t.trades.length > 5000) t.trades.splice(0, t.trades.length - 5000);
  }

  /** Nettoyage : oublie les échanges de plus d'une heure et les tokens inactifs depuis 6 h. */
  prune(now = Date.now()) {
    for (const [mint, t] of this.tokens) {
      const i = t.trades.findIndex((x) => now - x.t <= HOUR);
      if (i === -1) t.trades = [];
      else if (i > 0) t.trades.splice(0, i);
      if (now - t.lastTradeAt > 6 * HOUR) this.tokens.delete(mint);
    }
    if (this.tokens.size > MAX_TOKENS) {
      const oldest = [...this.tokens.values()].sort((a, b) => a.lastTradeAt - b.lastTradeAt).slice(0, this.tokens.size - MAX_TOKENS);
      for (const t of oldest) this.tokens.delete(t.mint);
    }
  }

  /** Résumé d'un token sur une fenêtre de temps (volume, achats, ventes, traders uniques). */
  summary(t: TokenState, windowMs: number, now = Date.now()) {
    let volume = 0, buys = 0, sells = 0;
    const users = new Set<string>();
    for (const x of t.trades) {
      if (now - x.t > windowMs) continue;
      volume += x.sol;
      if (x.buy) buys++;
      else sells++;
      users.add(x.user);
    }
    return {
      mint: t.mint,
      name: t.name,
      symbol: t.symbol,
      uri: t.uri,
      createdAt: t.createdAt,
      complete: t.complete,
      priceSol: t.priceSol,
      mcapSol: t.priceSol * 1e9,
      volumeSol: volume,
      buys,
      sells,
      traders: users.size,
    };
  }

  newest(limit: number) {
    const out = [];
    for (const mint of this.createdOrder) {
      const t = this.tokens.get(mint);
      if (t) out.push(this.summary(t, HOUR));
      if (out.length >= limit) break;
    }
    return out;
  }

  /** Tendances : les tokens où il y a le plus de monde sur la fenêtre (au moins 5 traders différents). */
  trending(windowMs: number, limit: number) {
    return [...this.tokens.values()]
      .map((t) => this.summary(t, windowMs))
      .filter((s) => s.traders >= 5 && s.symbol)
      .sort((a, b) => b.volumeSol - a.volumeSol)
      .slice(0, limit);
  }
}
