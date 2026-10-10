"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getBalances, type Balances } from "@/lib/solana/cash";
import { CLUSTER } from "@/lib/solana/config";

/** Barre « liquidités » en haut de l'accueil : le cash disponible pour trader, et le bouton Déposer. */
export function CashBar() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [b, setB] = useState<Balances | null>(null);
  const [usdEur, setUsdEur] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/prix")
      .then((r) => r.json())
      .then((j: { usdEur: number | null }) => setUsdEur(j.usdEur))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!publicKey) return;
    let stop = false;
    const load = () => getBalances(connection, publicKey).then((v) => !stop && setB(v)).catch(() => undefined);
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [connection, publicKey]);

  if (!publicKey) return null;
  const cash = b ? b.USDC + (usdEur ? b.EURC / usdEur : 0) : null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-electrique to-[#6a3fe0] px-5 py-4 text-white shadow-[0_18px_40px_-20px_rgb(61_90_254/0.9)]">
      <div>
        <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-none">
          {cash === null ? "…" : cash.toLocaleString("en-US", { style: "currency", currency: "USD" })}
        </p>
        <p className="mt-1 text-xs font-semibold text-white/75">liquidités{(CLUSTER as string) === "devnet" ? " · bêta, argent fictif" : ""}</p>
      </div>
      <Link href="/portefeuille" className="btn-fete min-h-10 px-5 py-2 text-sm">
        Déposer
      </Link>
    </div>
  );
}
