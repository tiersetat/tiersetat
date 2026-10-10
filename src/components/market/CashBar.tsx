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
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-[family-name:var(--font-display)] text-[2.6rem] leading-none font-extrabold tracking-tight">
          {cash === null ? "…" : cash.toLocaleString("en-US", { style: "currency", currency: "USD" })}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">liquidités{(CLUSTER as string) === "devnet" ? " · bêta, argent fictif" : ""}</p>
      </div>
      <Link href="/portefeuille" className="btn-primary min-h-11 px-6">
        Déposer
      </Link>
    </div>
  );
}
