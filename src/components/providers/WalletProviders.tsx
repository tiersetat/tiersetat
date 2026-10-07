"use client";

import { useMemo, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { RPC_URL } from "@/lib/solana/config";
import { PrivyBridge } from "./PrivyBridge";
import { SessionProvider } from "./SessionProvider";
import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletProviders({ children }: { children: ReactNode }) {
  // Adapters explicites : Phantom et Solflare restent listés même si la détection
  // Wallet Standard échoue (Solflare propose aussi son wallet web sans extension).
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet })],
    [],
  );

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <PrivyBridge>
            <SessionProvider>{children}</SessionProvider>
          </PrivyBridge>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
