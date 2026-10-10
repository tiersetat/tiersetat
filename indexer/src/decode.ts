/**
 * Décodage des événements émis par le programme pump.fun dans les journaux des transactions
 * (« Program data: … », format Anchor : 8 octets d'identifiant puis les champs en Borsh).
 * Seuls les premiers champs, stables d'une version à l'autre, sont lus.
 */
import { createHash } from "node:crypto";
import bs58 from "bs58";

export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

const disc = (name: string) => createHash("sha256").update(`event:${name}`).digest().subarray(0, 8).toString("hex");
const CREATE = disc("CreateEvent");
const TRADE = disc("TradeEvent");
const COMPLETE = disc("CompleteEvent");

export type CreateEvent = {
  kind: "create";
  name: string;
  symbol: string;
  uri: string;
  mint: string;
  bondingCurve: string;
  user: string;
  creator: string;
  timestamp: number;
  /** Prix de départ d'un token en SOL (réserves virtuelles de la courbe à la création) */
  priceSol: number;
};
export type TradeEvent = {
  kind: "trade";
  mint: string;
  solAmount: number; // en SOL
  tokenAmount: number; // en tokens (6 décimales)
  isBuy: boolean;
  user: string;
  timestamp: number;
  /** Prix d'un token en SOL, d'après les réserves virtuelles de la courbe après l'échange */
  priceSol: number;
};
export type CompleteEvent = { kind: "complete"; mint: string; user: string; timestamp: number };
export type PumpEvent = CreateEvent | TradeEvent | CompleteEvent;

class Reader {
  o = 8;
  constructor(private b: Buffer) {}
  str() {
    const n = this.b.readUInt32LE(this.o);
    this.o += 4;
    const s = this.b.subarray(this.o, this.o + n).toString("utf8");
    this.o += n;
    return s;
  }
  key() {
    const k = bs58.encode(this.b.subarray(this.o, this.o + 32));
    this.o += 32;
    return k;
  }
  u64() {
    const v = this.b.readBigUInt64LE(this.o);
    this.o += 8;
    return v;
  }
  i64() {
    const v = this.b.readBigInt64LE(this.o);
    this.o += 8;
    return Number(v);
  }
  bool() {
    return this.b[this.o++] === 1;
  }
}

/** Un message « Program data » → un événement, ou null s'il ne nous intéresse pas (ou s'il est illisible). */
export function decodeProgramData(base64: string): PumpEvent | null {
  const b = Buffer.from(base64, "base64");
  if (b.length < 8) return null;
  const d = b.subarray(0, 8).toString("hex");
  try {
    const r = new Reader(b);
    if (d === CREATE) {
      const base = { name: r.str(), symbol: r.str(), uri: r.str(), mint: r.key(), bondingCurve: r.key(), user: r.key(), creator: r.key(), timestamp: r.i64() };
      const vTok = r.u64();
      const vSol = r.u64();
      return { kind: "create", ...base, priceSol: vTok > BigInt(0) ? Number(vSol) / 1e9 / (Number(vTok) / 1e6) : 0 };
    }
    if (d === TRADE) {
      const mint = r.key();
      const sol = r.u64();
      const tok = r.u64();
      const isBuy = r.bool();
      const user = r.key();
      const timestamp = r.i64();
      const vSol = r.u64();
      const vTok = r.u64();
      const priceSol = vTok > BigInt(0) ? Number(vSol) / 1e9 / (Number(vTok) / 1e6) : 0;
      return { kind: "trade", mint, solAmount: Number(sol) / 1e9, tokenAmount: Number(tok) / 1e6, isBuy, user, timestamp, priceSol };
    }
    if (d === COMPLETE) {
      const user = r.key();
      const mint = r.key();
      r.key(); // bonding curve
      return { kind: "complete", mint, user, timestamp: r.i64() };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Tous les événements pump.fun d'une liste de journaux de transaction.
 * Sécurité : n'importe quel programme peut écrire un faux « Program data » imitant pump.fun
 * (des robots le font pour gonfler l'activité). On suit donc la pile d'appels et on ne garde
 * que les messages émis par le programme pump.fun lui-même, et seulement s'il a réussi.
 */
export function eventsFromLogs(logs: string[]): PumpEvent[] {
  const out: PumpEvent[] = [];
  const stack: string[] = [];
  let pending: PumpEvent[] = [];
  for (const l of logs) {
    const invoke = l.match(/^Program (\w+) invoke \[\d+\]$/);
    if (invoke) {
      stack.push(invoke[1]);
      continue;
    }
    const end = l.match(/^Program (\w+) (success|failed)/);
    if (end) {
      const prog = stack.pop();
      if (prog === PUMP_PROGRAM) {
        if (end[2] === "success") out.push(...pending);
        pending = [];
      }
      continue;
    }
    if (l.startsWith("Program data: ") && stack[stack.length - 1] === PUMP_PROGRAM) {
      const e = decodeProgramData(l.slice(14));
      if (e) pending.push(e);
    }
  }
  return out;
}
