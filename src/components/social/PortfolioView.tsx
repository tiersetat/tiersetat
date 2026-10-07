"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Eur } from "@/components/Eur";
import { buildPortfolio, type Holding, type TradeLite } from "@/lib/portfolio";
import { computePoolStats, decodePoolAccount } from "@/lib/solana/pool-stats";
import { MIGRATION_QUOTE_THRESHOLD_LAMPORTS } from "@/lib/solana/platform";
import { supabaseBrowser } from "@/lib/supabase/browser";

const fmt = (n: number, d = 4) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });

type Result = ReturnType<typeof buildPortfolio>;

/** Portefeuille du wallet connecté : soldes on-chain × prix des pools, gains/pertes d'après les trades indexés. */
export function PortfolioView() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setError(null);
    try {
      const supabase = supabaseBrowser();
      if (!supabase) throw new Error("Base indisponible");
      // 1. Tous les comptes de tokens SPL du wallet (soldes non nuls)
      const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
      const balances = new Map<string, number>();
      for (const a of accounts.value) {
        const info = a.account.data.parsed.info as { mint: string; tokenAmount: { uiAmount: number | null } };
        const amount = info.tokenAmount.uiAmount ?? 0;
        if (amount > 0) balances.set(info.mint, (balances.get(info.mint) ?? 0) + amount);
      }
      if (balances.size === 0) return setData(buildPortfolio([], []));

      // 2. Ceux qui sont des tokens Tiers-État (visibles)
      const mints = [...balances.keys()];
      const [{ data: tokens }, { data: trades }] = await Promise.all([
        supabase.from("tokens").select("mint, pool, name, ticker, image_url").in("mint", mints),
        supabase.from("trades").select("mint, side, sol_amount").eq("trader_wallet", publicKey.toBase58()).in("mint", mints).limit(5000),
      ]);
      const list = (tokens ?? []) as { mint: string; pool: string; name: string; ticker: string; image_url: string }[];

      // 3. Prix actuel de chaque token (décodage direct des pools)
      const pools = await connection.getMultipleAccountsInfo(list.map((t) => new PublicKey(t.pool)));
      const holdings: Holding[] = list.map((t, i) => {
        const acc = pools[i];
        const priceSol = acc ? computePoolStats(decodePoolAccount(acc.data), MIGRATION_QUOTE_THRESHOLD_LAMPORTS).priceSol : 0;
        return { mint: t.mint, name: t.name, ticker: t.ticker, image_url: t.image_url, amount: balances.get(t.mint) ?? 0, priceSol };
      });
      setData(buildPortfolio(holdings, (trades ?? []) as TradeLite[]));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(buildPortfolio([], []));
    }
  }, [connection, publicKey]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!publicKey) {
    return (
      <div className="surface space-y-3 p-10 text-center">
        <p className="text-muted-foreground">Connecte ton wallet pour voir ton portefeuille.</p>
        <button type="button" className="btn-primary" onClick={() => setVisible(true)}>
          Connecter un wallet
        </button>
      </div>
    );
  }
  if (!data) return <div className="surface p-10 text-center text-sm text-muted-foreground">Lecture de ton wallet sur la blockchain…</div>;

  const pnlClass = (n: number) => (n >= 0 ? "text-achat" : "text-vente");

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-1 divide-ligne rounded-2xl border border-ligne bg-white/[0.02] sm:grid-cols-3 sm:divide-x">
        <div className="px-5 py-4">
          <dt className="text-xs text-muted-foreground">Valeur totale</dt>
          <dd className="mt-1 font-mono text-2xl font-medium">{fmt(data.total.valueSol)} SOL</dd>
          <Eur sol={data.total.valueSol} />
        </div>
        <div className="px-5 py-4">
          <dt className="text-xs text-muted-foreground">SOL investis</dt>
          <dd className="mt-1 font-mono text-2xl font-medium">{fmt(data.total.spentSol)} SOL</dd>
          <Eur sol={data.total.spentSol} />
        </div>
        <div className="px-5 py-4">
          <dt className="text-xs text-muted-foreground">Gains / pertes</dt>
          <dd className={`mt-1 font-mono text-2xl font-medium ${pnlClass(data.total.pnlSol)}`}>
            {data.total.pnlSol >= 0 ? "+" : ""}
            {fmt(data.total.pnlSol)} SOL
          </dd>
          <Eur sol={data.total.pnlSol} />
        </div>
      </dl>

      {error && <p className="text-sm text-vente">{error}</p>}

      {data.lines.length === 0 ? (
        <div className="surface space-y-3 p-10 text-center">
          <p className="text-muted-foreground">Tu ne détiens encore aucun token Tiers-État.</p>
          <Link href="/" className="btn-primary">
            Explorer les tokens
          </Link>
        </div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Token</th>
                <th className="px-3 py-3 text-right font-medium">Quantité</th>
                <th className="px-3 py-3 text-right font-medium">Valeur</th>
                <th className="px-5 py-3 text-right font-medium">Gains / pertes</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l) => (
                <tr key={l.mint} className="border-t border-ligne">
                  <td className="px-5 py-3">
                    <Link href={`/token/${l.mint}`} className="flex items-center gap-3 hover:text-pervenche">
                      {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS */}
                      <img src={l.image_url} alt="" className="size-8 rounded-lg object-cover" />
                      <span>
                        {l.name} <span className="font-mono text-xs text-pervenche">${l.ticker}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs">{fmt(l.amount, 0)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="block font-mono text-xs">{fmt(l.valueSol)} SOL</span>
                    <Eur sol={l.valueSol} className="text-[11px] text-muted-foreground/80" />
                  </td>
                  <td className={`px-5 py-3 text-right font-mono text-xs ${pnlClass(l.pnlSol)}`}>
                    {l.pnlSol >= 0 ? "+" : ""}
                    {fmt(l.pnlSol)} SOL
                    {l.pnlPct !== null && <span className="block text-[11px]">{l.pnlPct >= 0 ? "+" : ""}{fmt(l.pnlPct, 1)} %</span>}
                    <Link href={`/token/${l.mint}/position/${publicKey?.toBase58()}`} className="mt-1 block text-[11px] text-lueur hover:underline">
                      Récap à partager →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground/80">
        Valeur au prix actuel de la bonding curve (avant frais de vente). Les gains et pertes sont calculés d&apos;après les échanges passés par Tiers-État.
      </p>
    </div>
  );
}
