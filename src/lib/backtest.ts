/**
 * Backtest simple sur les bougies d'un graphique : rejoue une stratégie sur l'historique réel.
 * Règles honnêtes : décision à la clôture d'une bougie, exécution à l'ouverture de la suivante (aucune donnée du futur),
 * frais à chaque entrée et sortie, position en tout ou rien, sans levier. Comparé à « garder du début à la fin ».
 * Les performances passées ne prédisent pas l'avenir.
 */
export type Candle = { time: number; open: number; high: number; low: number; close: number };
export type Strategy = "croisement" | "rsi" | "cassure";
export type Mode = "long" | "longshort";

export const STRATEGIES: { key: Strategy; label: string; explication: string }[] = [
  { key: "croisement", label: "Croisement MM20 / MM50", explication: "Achat quand la moyenne 20 passe au-dessus de la moyenne 50, vente quand elle repasse dessous." },
  { key: "rsi", label: "RSI 30 / 70", explication: "Achat quand le RSI repasse au-dessus de 30 (sortie de survente), vente quand il repasse sous 70." },
  { key: "cassure", label: "Cassure du plus haut 20", explication: "Achat quand le prix clôture au-dessus du plus haut des 20 bougies précédentes, vente sous le plus bas des 10." },
];

export type Trade = { side: "long" | "short"; entryTime: number; entry: number; exitTime: number; exit: number; pnlPct: number };
export type BacktestResult = {
  trades: Trade[];
  totalPct: number;
  holdPct: number;
  winRate: number | null;
  maxDrawdownPct: number;
  exposurePct: number;
  bars: number;
};

function smaAt(c: Candle[], i: number, n: number): number | null {
  if (i + 1 < n) return null;
  let s = 0;
  for (let k = i - n + 1; k <= i; k++) s += c[k].close;
  return s / n;
}

function rsiSeries(c: Candle[], n = 14): (number | null)[] {
  const out: (number | null)[] = c.map(() => null);
  if (c.length <= n) return out;
  let g = 0;
  let l = 0;
  for (let i = 1; i <= n; i++) {
    const d = c[i].close - c[i - 1].close;
    g += Math.max(d, 0);
    l += Math.max(-d, 0);
  }
  let ag = g / n;
  let al = l / n;
  out[n] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = n + 1; i < c.length; i++) {
    const d = c[i].close - c[i - 1].close;
    ag = (ag * (n - 1) + Math.max(d, 0)) / n;
    al = (al * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

/** Signal à la clôture de la bougie i : 1 = vouloir être acheteur, -1 = vouloir être vendeur/sorti, 0 = rien de nouveau. */
function signals(c: Candle[], s: Strategy): number[] {
  const sig = c.map(() => 0);
  if (s === "croisement") {
    for (let i = 1; i < c.length; i++) {
      const f0 = smaAt(c, i - 1, 20), s0 = smaAt(c, i - 1, 50), f1 = smaAt(c, i, 20), s1 = smaAt(c, i, 50);
      if (f0 === null || s0 === null || f1 === null || s1 === null) continue;
      if (f0 <= s0 && f1 > s1) sig[i] = 1;
      else if (f0 >= s0 && f1 < s1) sig[i] = -1;
    }
  } else if (s === "rsi") {
    const r = rsiSeries(c);
    for (let i = 1; i < c.length; i++) {
      const a = r[i - 1], b = r[i];
      if (a === null || b === null) continue;
      if (a < 30 && b >= 30) sig[i] = 1;
      else if (a > 70 && b <= 70) sig[i] = -1;
    }
  } else {
    for (let i = 20; i < c.length; i++) {
      let hi = -Infinity;
      for (let k = i - 20; k < i; k++) hi = Math.max(hi, c[k].high);
      let lo = Infinity;
      for (let k = Math.max(0, i - 10); k < i; k++) lo = Math.min(lo, c[k].low);
      if (c[i].close > hi) sig[i] = 1;
      else if (c[i].close < lo) sig[i] = -1;
    }
  }
  return sig;
}

export function backtest(c: Candle[], strategy: Strategy, mode: Mode = "long", feePct = 0.1): BacktestResult {
  const fee = feePct / 100;
  const sig = signals(c, strategy);
  const trades: Trade[] = [];
  // 1 = acheteur, -1 = vendeur, 0 = sans position (modifiée dans les fonctions ci-dessous)
  let pos = 0 as number;
  let entry = 0;
  let entryTime = 0;
  let equity = 1;
  let peak = 1;
  let maxDd = 0;
  let inBars = 0;

  const close = (i: number) => {
    const exit = c[i].open;
    const gross = pos === 1 ? exit / entry : entry / exit;
    const net = gross * (1 - fee) * (1 - fee);
    equity *= net;
    trades.push({ side: pos === 1 ? "long" : "short", entryTime, entry, exitTime: c[i].time, exit, pnlPct: (net - 1) * 100 });
    pos = 0;
  };
  const open = (i: number, side: 1 | -1) => {
    pos = side;
    entry = c[i].open;
    entryTime = c[i].time;
  };

  for (let i = 1; i < c.length; i++) {
    const want = sig[i - 1]; // décidé à la clôture d'avant, exécuté à l'ouverture de celle-ci
    if (want === 1 && pos !== 1) {
      if (pos === -1) close(i);
      open(i, 1);
    } else if (want === -1 && pos === 1) {
      close(i);
      if (mode === "longshort") open(i, -1);
    } else if (want === -1 && pos === 0 && mode === "longshort") {
      open(i, -1);
    }
    if (pos !== 0) inBars++;
    // Valeur du portefeuille à la clôture (pour la pire baisse)
    const mark = pos === 0 ? equity : equity * (pos === 1 ? c[i].close / entry : entry / c[i].close);
    peak = Math.max(peak, mark);
    maxDd = Math.max(maxDd, (peak - mark) / peak);
  }
  if (pos !== 0 && c.length > 1) {
    // Position encore ouverte : clôturée au dernier prix connu
    const last = c[c.length - 1];
    const gross = pos === 1 ? last.close / entry : entry / last.close;
    const net = gross * (1 - fee) * (1 - fee);
    equity *= net;
    trades.push({ side: pos === 1 ? "long" : "short", entryTime, entry, exitTime: last.time, exit: last.close, pnlPct: (net - 1) * 100 });
  }
  const wins = trades.filter((t) => t.pnlPct > 0).length;
  return {
    trades,
    totalPct: (equity - 1) * 100,
    holdPct: c.length > 1 ? (c[c.length - 1].close / c[0].open - 1) * 100 : 0,
    winRate: trades.length ? (wins / trades.length) * 100 : null,
    maxDrawdownPct: maxDd * 100,
    exposurePct: c.length > 1 ? (inBars / (c.length - 1)) * 100 : 0,
    bars: c.length,
  };
}
