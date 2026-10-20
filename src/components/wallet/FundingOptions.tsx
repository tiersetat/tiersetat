"use client";

import { useState } from "react";
import { useFundWallet } from "@privy-io/react-auth/solana";
import { CLUSTER } from "@/lib/solana/config";
import { PRIVY_APP_ID } from "@/components/providers/PrivyBridge";

const DEVNET = (CLUSTER as string) === "devnet";

/** Plateformes d'où retirer des USDC ou des SOL vers son portefeuille Tiers-État (réseau Solana). */
const EXCHANGES = [
  { name: "OKX", url: "https://www.okx.com/balance/withdrawal", color: "#ffffff", fg: "#000000" },
  { name: "Coinbase", url: "https://www.coinbase.com/", color: "#0052ff", fg: "#ffffff" },
  { name: "Binance", url: "https://www.binance.com/fr/my/wallet/account/main/withdrawal/crypto", color: "#f3ba2f", fg: "#000000" },
  { name: "Kraken", url: "https://www.kraken.com/", color: "#7132f5", fg: "#ffffff" },
];

function Row({ icon, title, sub, onClick, href, badge }: { icon: string; title: string; sub: string; onClick?: () => void; href?: string; badge?: string }) {
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/[0.08] text-xl">{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2 font-bold">
          {title}
          {badge && <span className="rounded-full bg-soleil/15 px-2 py-0.5 text-[10px] font-extrabold text-soleil">{badge}</span>}
        </span>
        <span className="block text-sm text-muted-foreground">{sub}</span>
      </span>
      <span className="text-muted-foreground" aria-hidden>
        ›
      </span>
    </>
  );
  const cls = "ios-press flex w-full items-center gap-3 rounded-2xl p-3 transition hover:bg-white/[0.05]";
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Carte bancaire / Apple Pay : passe par Privy (prestataire de paiement agréé). Actif sur le réseau principal. */
function CardRow({ address }: { address: string }) {
  if (!PRIVY_APP_ID) return <Row icon="💳" title="Carte de débit ou Apple Pay" sub="Bientôt, avec un partenaire agréé MiCA" badge="Bientôt" />;
  return <CardRowPrivy address={address} />;
}
function CardRowPrivy({ address }: { address: string }) {
  const { fundWallet } = useFundWallet();
  const [msg, setMsg] = useState<string | null>(null);
  const go = async () => {
    if (DEVNET) return setMsg("Le paiement par carte arrivera avec un partenaire agréé MiCA, au lancement de l'argent réel.");
    try {
      await fundWallet({ address });
    } catch {
      setMsg("Le paiement par carte n'a pas pu s'ouvrir. Réessaie dans un instant.");
    }
  };
  return (
    <>
      <Row icon="💳" title="Carte de débit ou Apple Pay" sub={DEVNET ? "Bientôt, avec un partenaire agréé MiCA" : "Achète des USDC ou des SOL en quelques secondes"} badge={DEVNET ? "Bientôt" : undefined} onClick={go} />
      {msg && <p className="px-3 text-sm text-muted-foreground">{msg}</p>}
    </>
  );
}

/** « Déposer » : carte bancaire, portefeuille crypto, plateforme d'échange. */
export function DepositOptions({ address, onReceive }: { address: string; onReceive: () => void }) {
  const [exchanges, setExchanges] = useState(false);
  return (
    <div className="space-y-1 rounded-3xl bg-surface p-2 ring-1 ring-white/[0.08]">
      <p className="px-3 pt-2 pb-1 text-lg font-extrabold">Déposer des fonds</p>
      <CardRow address={address} />
      <Row icon="📲" title="Depuis un portefeuille crypto" sub="Reçois des USDC ou des SOL (Phantom, Solflare…)" onClick={onReceive} />
      <Row icon="🏦" title="Depuis une plateforme d'échange" sub="OKX, Coinbase, Binance, Kraken…" badge={DEVNET ? "Bientôt" : undefined} onClick={DEVNET ? undefined : () => setExchanges((v) => !v)} />
      {exchanges && !DEVNET && (
        <div className="space-y-3 rounded-2xl bg-white/[0.04] p-4">
          <p className="text-sm text-muted-foreground">
            Sur ta plateforme, choisis <strong className="text-foreground">Retrait</strong>, la monnaie <strong className="text-foreground">USDC ou SOL</strong>, le réseau{" "}
            <strong className="text-foreground">Solana</strong>, puis colle ton adresse Tiers-État.
          </p>
          <button type="button" onClick={onReceive} className="btn-ghost min-h-10 w-full text-sm">
            Afficher mon adresse
          </button>
          <div className="grid grid-cols-2 gap-2">
            {EXCHANGES.map((e) => (
              <a key={e.name} href={e.url} target="_blank" rel="noreferrer" className="ios-press rounded-xl px-3 py-2.5 text-center text-sm font-extrabold" style={{ background: e.color, color: e.fg }}>
                {e.name} ↗
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Cash App n&apos;envoie pas encore d&apos;USDC sur Solana : passe par une autre plateforme.</p>
        </div>
      )}
    </div>
  );
}

/** « Vendre » : convertir ses SOL ou USDC en euros, vers son compte bancaire. */
export function SellOptions({ onSend }: { onSend: () => void }) {
  const [okx, setOkx] = useState(false);
  return (
    <div className="space-y-1 rounded-3xl bg-surface p-2 ring-1 ring-white/[0.08]">
      <p className="px-3 pt-2 pb-1 text-lg font-extrabold">Vendre mes cryptos</p>
      <Row icon="💶" title="Vendre des SOL contre des euros" sub="Virement direct sur ton compte bancaire" badge="Bientôt" />
      <Row icon="🏦" title="Vendre sur une plateforme d'échange" sub="Envoie tes SOL ou USDC sur OKX, puis vends-les en euros" onClick={() => setOkx((v) => !v)} />
      {okx && (
        <div className="space-y-3 rounded-2xl bg-white/[0.04] p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Sur OKX, ouvre <strong className="text-foreground">Dépôt</strong>, choisis SOL ou USDC et le réseau <strong className="text-foreground">Solana</strong>.</li>
            <li>Copie l&apos;adresse de dépôt OKX.</li>
            <li>Ici, touche Envoyer et colle cette adresse.</li>
            <li>Sur OKX, vends contre des euros et retire-les sur ton compte bancaire.</li>
          </ol>
          <div className="grid grid-cols-2 gap-2">
            <a href="https://www.okx.com/balance/recharge" target="_blank" rel="noreferrer" className="ios-press rounded-xl bg-white px-3 py-2.5 text-center text-sm font-extrabold text-black">
              Ouvrir OKX ↗
            </a>
            <button type="button" onClick={onSend} className="btn-primary min-h-0 py-2.5 text-sm">
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
