import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { displayName } from "@/lib/display";
import { formatDuration } from "@/lib/position";
import { getPositionData } from "@/lib/position-data";
import { solanaAddress } from "@/lib/validators";

export const alt = "Récap de position sur Tiers-État";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** Carte de position à partager : performance en grand, token, trader, entrée et sortie. */
export default async function Image({ params }: { params: Promise<{ mint: string; wallet: string }> }) {
  const { mint, wallet } = await params;
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/images/logo.png"))).toString("base64")}`;
  const data = solanaAddress.safeParse(mint).success && solanaAddress.safeParse(wallet).success ? await getPositionData(mint, wallet) : null;

  let tokenImage: string | null = null;
  if (data?.token.image_url) {
    try {
      const res = await fetch(data.token.image_url, { signal: AbortSignal.timeout(4000) });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && /image\/(png|jpe?g)/.test(type)) tokenImage = `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    } catch {
      /* image facultative */
    }
  }

  const p = data?.position;
  const gain = (p?.pnlSol ?? 0) >= 0;
  const accent = gain ? "#3dffa8" : "#ff3b5c";
  const pctText = p?.pnlPct == null ? "—" : `${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct.toLocaleString("fr-FR", { maximumFractionDigits: Math.abs(p.pnlPct) < 10 ? 1 : 0 })} %`;
  const multiple = p?.multiple == null ? null : `x${p.multiple.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`;
  const end = p?.closed && p.lastSellAt ? p.lastSellAt : new Date().toISOString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: `radial-gradient(700px 420px at 85% 0%, ${gain ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}, transparent 70%), radial-gradient(900px 500px at 10% 110%, rgba(61,90,254,0.25), #0b0d2a 70%)`,
          color: "#f4f1fa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={logo} width={52} height={52} alt="" />
          <span style={{ fontSize: 32, fontWeight: 700 }}>Tiers-État</span>
          <span style={{ fontSize: 22, color: "#9b98ad", marginLeft: 12 }}>Le launchpad des mèmes français</span>
        </div>

        {data && p ? (
          <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
            {tokenImage ? (
              <img src={tokenImage} width={220} height={220} alt="" style={{ borderRadius: 32, objectFit: "cover", border: "2px solid rgba(255,255,255,0.15)" }} />
            ) : (
              <div style={{ width: 220, height: 220, borderRadius: 32, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 110, color: "#8c93c9" }}>
                {data.token.ticker.slice(0, 1)}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 40, color: "#8c93c9" }}>${data.token.ticker}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
                <span style={{ fontSize: 132, fontWeight: 800, color: accent, lineHeight: 1.05 }}>{pctText}</span>
                {multiple && <span style={{ fontSize: 56, fontWeight: 700 }}>{multiple}</span>}
              </div>
              <span style={{ fontSize: 30, color: "#c8c6ee" }}>par {displayName(data.trader)}</span>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 64, fontWeight: 700 }}>Le peuple frappe sa monnaie.</span>
        )}

        {p?.firstBuyAt ? (
          <div style={{ display: "flex", gap: 56, fontSize: 26, color: "#9b98ad" }}>
            <span style={{ display: "flex", gap: 10 }}>
              Entrée <span style={{ color: "#f4f1fa" }}>{day(p.firstBuyAt)}</span>
            </span>
            <span style={{ display: "flex", gap: 10 }}>
              {p.closed ? "Sortie" : "Toujours en position"}
              {p.closed && p.lastSellAt && <span style={{ color: "#f4f1fa" }}>{day(p.lastSellAt)}</span>}
            </span>
            <span style={{ display: "flex", gap: 10 }}>
              Durée <span style={{ color: "#f4f1fa" }}>{formatDuration(p.firstBuyAt, end)}</span>
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 26, color: "#9b98ad" }}>tiersetat.fun</span>
        )}
      </div>
    ),
    size,
  );
}
