import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { searchRadar } from "@/lib/radar";
import { age, isSolanaAddress } from "@/lib/radar-utils";
import { pct, usd } from "@/lib/market-format";
import { jupInfo } from "@/lib/jup-info";

export const alt = "Token sur Tiers-État";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Aperçu de partage (X, Discord…) d'un token du marché : l'image et, à côté, ses chiffres clés. */
export default async function Image({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/images/logo.png"))).toString("base64")}`;
  const [[t], info] = isSolanaAddress(mint) ? await Promise.all([searchRadar(mint).catch(() => []), jupInfo(mint)]) : [[], null];

  // Image du token en data URL (PNG / JPEG uniquement, formats sûrs pour le rendu)
  let tokenImage: string | null = null;
  if (t?.imageUrl) {
    try {
      const res = await fetch(t.imageUrl, { signal: AbortSignal.timeout(4000) });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && /image\/(png|jpe?g)/.test(type)) tokenImage = `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    } catch {
      /* image facultative */
    }
  }
  const up = (t?.change.h24 ?? 0) >= 0;
  const stats: [string, string][] = t
    ? [
        ["Prix", usd(t.priceUsd)],
        ["Liquidité", usd(t.liquidityUsd)],
        ["Vol. 24 h", usd(t.volume24Usd)],
        ["Âge", age(t.createdAt)],
        ...(info?.holders != null ? ([["Détenteurs", info.holders.toLocaleString("fr-FR")]] as [string, string][]) : []),
      ]
    : [];

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
          background: "radial-gradient(900px 500px at 50% -10%, rgba(61,90,254,0.35), #0b0d2a 70%)",
          color: "#f4f1fa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={logo} width={56} height={56} alt="" />
          <span style={{ fontSize: 34, fontWeight: 700 }}>Tiers-État</span>
        </div>

        {t ? (
          <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
            {tokenImage ? (
              <img src={tokenImage} width={280} height={280} alt="" style={{ borderRadius: 36, objectFit: "cover", border: "2px solid rgba(255,255,255,0.15)" }} />
            ) : (
              <div style={{ width: 280, height: 280, borderRadius: 36, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, color: "#8c93c9" }}>
                {t.symbol.slice(0, 1)}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 740 }}>
              <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>${t.symbol.slice(0, 14)}</span>
              <span style={{ fontSize: 32, color: "#9b98ad" }}>{t.name.slice(0, 40)}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 8 }}>
                <span style={{ fontSize: 56, fontWeight: 700 }}>{usd(t.mcapUsd)}</span>
                <span style={{ fontSize: 34, fontWeight: 700, color: up ? "#3ddc97" : "#ff5c7a" }}>{pct(t.change.h24)} 24 h</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
                {stats.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 8, fontSize: 24, padding: "6px 16px", borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
                    <span style={{ color: "#9b98ad" }}>{k}</span>
                    <span style={{ fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 64, fontWeight: 700 }}>Trade toutes les cryptos.</span>
        )}

        <span style={{ fontSize: 22, color: "#9b98ad" }}>Données publiques, pour information. Pas une recommandation : les memecoins sont très risqués.</span>
      </div>
    ),
    size,
  );
}
