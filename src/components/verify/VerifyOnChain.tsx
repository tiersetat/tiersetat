"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { DBC_CONFIG, explorerUrl, TREASURY_WALLET } from "@/lib/solana/config";
import { PLATFORM_CURVE } from "@/lib/solana/platform";

type Check = { label: string; promesse: string; lu: string; ok: boolean };
type State = { kind: "loading" } | { kind: "error" } | { kind: "ok"; checks: Check[]; treasurySol: number | null };

const sol = (lamports: number) => (lamports / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 4 });

/**
 * Vérification en direct, depuis le navigateur du visiteur : les règles promises par Tiers-État
 * sont relues dans la configuration inscrite sur la blockchain. Notre serveur n'intervient pas.
 */
export function VerifyOnChain() {
  const { connection } = useConnection();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!DBC_CONFIG) return void Promise.resolve().then(() => setState({ kind: "error" }));
    let cancelled = false;
    Promise.all([import("@/lib/solana/dbc"), import("@meteora-ag/dynamic-bonding-curve-sdk")])
      .then(async ([{ dbcClient }, sdk]) => {
        const [cfg, balance] = await Promise.all([
          dbcClient(connection).state.getPoolConfig(DBC_CONFIG!),
          TREASURY_WALLET ? connection.getBalance(TREASURY_WALLET) : Promise.resolve(null),
        ]);
        if (!cfg) throw new Error("Configuration introuvable");
        const bf = cfg.poolFees.baseFee;
        const startPct = Number(bf.cliffFeeNumerator.toString()) / 1e7;
        // Frais normaux = fin du planificateur de frais (identiques au départ si pas d'anti-robots)
        const feePct =
          bf.firstFactor > 0
            ? sdk.calculateFeeSchedulerEndingBaseFeeBps(Number(bf.cliffFeeNumerator.toString()), bf.firstFactor, Number(bf.secondFactor.toString()), Number(bf.thirdFactor.toString()), bf.baseFeeMode) / 100
            : startPct;
        const antiBotSec = bf.firstFactor * Number(bf.secondFactor.toString());
        const creationFee = Number(cfg.poolCreationFee.toString());
        const supply = Number(cfg.preMigrationTokenSupply.toString()) / 10 ** PLATFORM_CURVE.tokenDecimals;
        const locked = Number(cfg.partnerPermanentLockedLiquidityPercentage) + Number(cfg.creatorPermanentLockedLiquidityPercentage);
        const unlocked = Number(cfg.partnerLiquidityPercentage) + Number(cfg.creatorLiquidityPercentage);
        const threshold = Number(cfg.migrationQuoteThreshold.toString());
        const checks: Check[] = [
          {
            label: "Frais par échange",
            promesse: `${PLATFORM_CURVE.tradingFeeBps / 100} %`,
            lu: `${feePct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`,
            ok: Math.abs(feePct - PLATFORM_CURVE.tradingFeeBps / 100) < 0.01,
          },
          {
            label: "Protection anti-robots au lancement",
            promesse: `${PLATFORM_CURVE.antiBot.startingFeeBps / 100} % puis 1 % en ${PLATFORM_CURVE.antiBot.durationSec} s`,
            lu: bf.firstFactor > 0 ? `${startPct.toLocaleString("fr-FR")} % puis ${feePct.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} % en ${antiBotSec} s` : "Aucune",
            ok: bf.firstFactor > 0 && startPct === PLATFORM_CURVE.antiBot.startingFeeBps / 100 && antiBotSec === PLATFORM_CURVE.antiBot.durationSec,
          },
          {
            label: "Part du créateur sur les frais",
            promesse: `${PLATFORM_CURVE.creatorTradingFeePercentage} %`,
            lu: `${Number(cfg.creatorTradingFeePercentage)} %`,
            ok: Number(cfg.creatorTradingFeePercentage) === PLATFORM_CURVE.creatorTradingFeePercentage,
          },
          {
            label: "Frais de création d'un token",
            promesse: `${PLATFORM_CURVE.poolCreationFeeSol.toLocaleString("fr-FR")} SOL`,
            lu: `${sol(creationFee)} SOL`,
            ok: Math.abs(creationFee / 1e9 - PLATFORM_CURVE.poolCreationFeeSol) < 1e-9,
          },
          {
            label: "Offre de chaque token, fixe",
            promesse: "1 milliard, jamais plus",
            lu: `${supply.toLocaleString("fr-FR")} · offre ${Number(cfg.fixedTokenSupplyFlag) === 1 ? "fixe" : "modifiable"}`,
            ok: supply === PLATFORM_CURVE.totalSupply && Number(cfg.fixedTokenSupplyFlag) === 1,
          },
          {
            label: "Nom et image modifiables après coup",
            promesse: "Non, définitifs",
            lu: Number(cfg.tokenUpdateAuthority) === sdk.TokenAuthorityOption.Immutable ? "Non, définitifs" : "Oui",
            ok: Number(cfg.tokenUpdateAuthority) === sdk.TokenAuthorityOption.Immutable,
          },
          { label: "Liquidité bloquée à vie après migration", promesse: "100 %", lu: `${locked} % (retirable : ${unlocked} %)`, ok: locked === 100 && unlocked === 0 },
          { label: "Seuil de la prise de la Bastille", promesse: "≈ 4,8 SOL collectés", lu: `${sol(threshold)} SOL`, ok: Math.abs(threshold / 1e9 - 4.805) < 0.01 },
          {
            label: "Frais de la plateforme versés à",
            promesse: "La trésorerie publique",
            lu: `${cfg.feeClaimer.toBase58().slice(0, 4)}…${cfg.feeClaimer.toBase58().slice(-4)}`,
            ok: !!TREASURY_WALLET && cfg.feeClaimer.equals(TREASURY_WALLET),
          },
        ];
        if (!cancelled) setState({ kind: "ok", checks, treasurySol: balance === null ? null : balance / 1e9 });
      })
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, [connection]);

  if (state.kind === "loading") return <div className="surface h-80 animate-pulse" />;
  if (state.kind === "error")
    return <p className="surface p-6 text-sm text-muted-foreground">Lecture de la blockchain impossible pour le moment. Réessaie dans un instant.</p>;

  const allOk = state.checks.every((c) => c.ok);
  return (
    <div className="space-y-4">
      <p className={`rounded-xl px-4 py-3 text-sm font-medium ${allOk ? "bg-achat/10 text-achat" : "bg-vente/10 text-vente"}`}>
        {allOk ? "✓ Toutes les règles promises sont bien inscrites sur la blockchain." : "⚠ Une règle diffère de ce qui est annoncé."}
      </p>
      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Règle</th>
              <th className="px-2 py-3 font-medium">Ce qu&apos;on promet</th>
              <th className="px-2 py-3 font-medium">Ce que dit la blockchain</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {state.checks.map((c) => (
              <tr key={c.label} className="border-t border-ligne">
                <td className="px-4 py-3">{c.label}</td>
                <td className="px-2 py-3 text-muted-foreground">{c.promesse}</td>
                <td className="px-2 py-3 font-mono">{c.lu}</td>
                <td className={`px-4 py-3 text-right font-semibold ${c.ok ? "text-achat" : "text-vente"}`}>{c.ok ? "✓" : "✗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Lu à l&apos;instant, directement depuis ton navigateur, dans le compte de configuration{" "}
        <a href={explorerUrl("address", DBC_CONFIG!.toBase58())} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2">
          {DBC_CONFIG!.toBase58().slice(0, 6)}…
        </a>
        .{state.treasurySol !== null && ` Solde actuel de la trésorerie : ${state.treasurySol.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} SOL.`}
      </p>
    </div>
  );
}
