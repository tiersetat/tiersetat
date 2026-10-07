/**
 * Tiers-État · interface de secours (hébergée sur IPFS).
 * Aucune dépendance à nos serveurs : les mèmes sont lus directement sur la blockchain
 * (programme Meteora + configurations Tiers-État), les échanges sont signés par le wallet du visiteur.
 */
import { Buffer } from "buffer";
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

import BN from "bn.js";
import { Connection, PublicKey, type Transaction } from "@solana/web3.js";
import { DynamicBondingCurveClient, SwapMode, deriveMintMetadata, getCurrentPoint } from "@meteora-ag/dynamic-bonding-curve-sdk";

declare const __CONFIGS__: string[];
declare const __CLUSTER__: string;
declare const __DEFAULT_RPC__: string;

type Wallet = { publicKey: PublicKey | null; connect: () => Promise<unknown>; signTransaction: (tx: Transaction) => Promise<Transaction> };
type Meme = { pool: string; mint: string; name: string; symbol: string; reserve: number; threshold: number; migrated: boolean };

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const fmt = (n: number, d = 4) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });
const explorer = (kind: "account" | "tx", v: string) => `https://solscan.io/${kind}/${v}?cluster=${__CLUSTER__}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let rpc = localStorage.getItem("te_rpc") || __DEFAULT_RPC__;
let connection = new Connection(rpc, "confirmed");
let client = DynamicBondingCurveClient.create(connection, "confirmed");
let wallet: Wallet | null = null;

function status(msg: string, kind: "info" | "ok" | "err" = "info") {
  const el = $("#status");
  el.textContent = msg;
  el.className = `status ${kind}`;
}

/** Nom et symbole lus dans les métadonnées Metaplex du token (chaînes préfixées par leur longueur). */
function decodeMetadata(data: Uint8Array): { name: string; symbol: string } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let o = 1 + 32 + 32;
  const read = () => {
    const len = view.getUint32(o, true);
    o += 4;
    const s = new TextDecoder().decode(data.slice(o, o + len)).replace(/\0/g, "").trim();
    o += len;
    return s;
  };
  return { name: read(), symbol: read() };
}

async function loadMemes(): Promise<Meme[]> {
  const memes: Meme[] = [];
  for (const cfgAddr of __CONFIGS__) {
    const cfg = await client.state.getPoolConfig(cfgAddr).catch(() => null);
    if (!cfg) continue;
    const threshold = Number(cfg.migrationQuoteThreshold.toString()) / 1e9;
    const pools = await client.state.getPoolsByConfig(cfgAddr);
    for (const p of pools) {
      const st = ((p.account as unknown as { poolState?: unknown }).poolState ?? p.account) as {
        baseMint: PublicKey;
        quoteReserve: BN;
        isMigrated: number;
      };
      memes.push({
        pool: p.publicKey.toBase58(),
        mint: st.baseMint.toBase58(),
        name: "",
        symbol: "",
        reserve: Number(st.quoteReserve.toString()) / 1e9,
        threshold,
        migrated: Number(st.isMigrated) === 1,
      });
    }
  }
  const metas = await connection.getMultipleAccountsInfo(memes.map((m) => deriveMintMetadata(new PublicKey(m.mint))));
  metas.forEach((acc, i) => {
    if (acc) Object.assign(memes[i], decodeMetadata(acc.data));
  });
  return memes.sort((a, b) => b.reserve - a.reserve);
}

function render(memes: Meme[]) {
  const list = $("#list");
  if (memes.length === 0) {
    list.innerHTML = `<p class="muted">Aucun mème trouvé sur la blockchain pour l'instant.</p>`;
    return;
  }
  list.innerHTML = memes
    .map((m) => {
      const pct = Math.min(100, (m.reserve / m.threshold) * 100);
      return `<article class="card" data-pool="${m.pool}">
        <div class="row"><strong>${esc(m.name || "Sans nom")}</strong><span class="tick">$${esc(m.symbol || "?")}</span></div>
        <div class="bar"><div style="width:${Math.max(pct, 1.5)}%"></div></div>
        <div class="row small muted"><span>${m.migrated ? "A pris la Bastille" : `Courbe ${fmt(pct, 0)} %`}</span>
        <a href="${explorer("account", m.mint)}" target="_blank" rel="noreferrer">${m.mint.slice(0, 4)}…${m.mint.slice(-4)} ↗</a></div>
        ${
          m.migrated
            ? `<p class="small muted">Ce mème s'échange désormais sur le marché Meteora.</p>`
            : `<div class="trade">
          <input type="text" inputmode="decimal" placeholder="Montant" aria-label="Montant" />
          <button data-side="buy">Acheter (SOL)</button><button data-side="sell" class="ghost">Vendre (tokens)</button></div>`
        }
      </article>`;
    })
    .join("");
}

async function connectWallet() {
  const w = (window as unknown as { phantom?: { solana?: Wallet }; solflare?: Wallet }).phantom?.solana ?? (window as unknown as { solflare?: Wallet }).solflare;
  if (!w) return status("Aucun wallet trouvé : installe Phantom ou Solflare.", "err");
  await w.connect();
  wallet = w;
  const pk = w.publicKey!.toBase58();
  $("#wallet").textContent = `${pk.slice(0, 4)}…${pk.slice(-4)}`;
  status("Wallet connecté.", "ok");
}

async function trade(pool: string, side: "buy" | "sell", raw: string) {
  if (!wallet?.publicKey) await connectWallet();
  if (!wallet?.publicKey) return;
  const amount = Number(raw.replace(",", "."));
  if (!(amount > 0)) return status("Saisis un montant.", "err");
  status("Préparation de la transaction…");
  const virtualPool = await client.state.getPool(pool);
  if (!virtualPool) return status("Pool introuvable.", "err");
  const config = await client.state.getPoolConfig(virtualPool.poolState.config);
  if (!config) return status("Configuration introuvable.", "err");
  const decimals = config.tokenDecimal ?? 6;
  const amountIn = new BN(Math.floor(amount * (side === "buy" ? 1e9 : 10 ** Number(decimals))).toString());
  const base = {
    virtualPool,
    config,
    swapBaseForQuote: side === "sell",
    hasReferral: false,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint: await getCurrentPoint(connection, config.activationType),
    slippageBps: 300,
  };
  // Achat en remplissage partiel : le dernier achat d'une courbe ne prend que ce qu'il faut
  const mode = side === "buy" ? SwapMode.PartialFill : SwapMode.ExactIn;
  const q = client.pool.swapQuote2({ ...base, swapMode: mode, amountIn } as Parameters<typeof client.pool.swapQuote2>[0]);
  const minOut = q.minimumAmountOut ?? new BN(q.outputAmount.toString()).muln(97).divn(100);
  const tx = await client.pool.swap2({
    owner: wallet.publicKey,
    pool: new PublicKey(pool),
    amountIn,
    minimumAmountOut: minOut,
    swapBaseForQuote: side === "sell",
    referralTokenAccount: null,
    swapMode: mode,
  } as Parameters<typeof client.pool.swap2>[0]);
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = latest.blockhash;
  status("Valide dans ton wallet…");
  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  status("Envoi…");
  await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
  $("#status").innerHTML = `Échange confirmé. <a href="${explorer("tx", sig)}" target="_blank" rel="noreferrer">Voir la transaction ↗</a>`;
  $("#status").className = "status ok";
  void refresh();
}

async function refresh() {
  $("#list").innerHTML = `<p class="muted">Lecture de la blockchain…</p>`;
  try {
    render(await loadMemes());
  } catch (e) {
    $("#list").innerHTML = `<p class="muted">Lecture impossible (${esc(String((e as Error).message || e)).slice(0, 120)}). Essaie un autre point d'accès RPC ci-dessous.</p>`;
  }
}

$("#connect").addEventListener("click", () => void connectWallet().catch((e) => status(String(e.message || e), "err")));
$("#list").addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("button[data-side]") as HTMLButtonElement | null;
  if (!btn) return;
  const card = btn.closest(".card") as HTMLElement;
  const input = card.querySelector("input") as HTMLInputElement;
  void trade(card.dataset.pool!, btn.dataset.side as "buy" | "sell", input.value).catch((err) =>
    status(/reject|refus|declin/i.test(String(err?.message)) ? "Transaction refusée dans le wallet." : `Échec : ${String(err?.message || err).slice(0, 140)}`, "err"),
  );
});
const rpcInput = $<HTMLInputElement>("#rpc");
rpcInput.value = rpc;
$("#rpc-save").addEventListener("click", () => {
  const v = rpcInput.value.trim();
  if (!/^https:\/\//.test(v) || /mainnet/i.test(v)) return status("Adresse RPC invalide (https, réseau de test uniquement).", "err");
  rpc = v;
  localStorage.setItem("te_rpc", v);
  connection = new Connection(rpc, "confirmed");
  client = DynamicBondingCurveClient.create(connection, "confirmed");
  status("Point d'accès RPC enregistré.", "ok");
  void refresh();
});
$("#cluster").textContent = __CLUSTER__;
void refresh();
