import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { supabasePublic } from "@/lib/supabase/public";

export const alt = "Token sur Tiers-État";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Image de partage (X, Discord…) générée pour chaque token : image, nom, ticker, market cap, progression. */
export default async function Image({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/images/logo.png"))).toString("base64")}`;
  const { data: t } = await supabasePublic()
    .from("tokens")
    .select("name, ticker, image_url, market_cap_sol, curve_progress")
    .eq("mint", mint)
    .maybeSingle<{ name: string; ticker: string; image_url: string; market_cap_sol: number; curve_progress: number }>();

  // Image du token en data URL (PNG / JPEG uniquement, formats sûrs pour le rendu)
  let tokenImage: string | null = null;
  if (t?.image_url) {
    try {
      const res = await fetch(t.image_url, { signal: AbortSignal.timeout(4000) });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && /image\/(png|jpe?g)/.test(type)) tokenImage = `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    } catch {
      /* image facultative */
    }
  }
  const progress = Math.max(2, Math.min(100, Number(t?.curve_progress ?? 0)));

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
          { }
          <img src={logo} width={56} height={56} alt="" />
          <span style={{ fontSize: 34, fontWeight: 700 }}>Tiers-État</span>
          <span style={{ fontSize: 24, color: "#9b98ad", marginLeft: 12 }}>Le launchpad des mèmes français</span>
        </div>

        {t ? (
          <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
            {tokenImage ? (
               
              <img src={tokenImage} width={260} height={260} alt="" style={{ borderRadius: 32, objectFit: "cover", border: "2px solid rgba(255,255,255,0.15)" }} />
            ) : (
              <div style={{ width: 260, height: 260, borderRadius: 32, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, color: "#8c93c9" }}>
                {t.ticker.slice(0, 1)}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
              <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>{t.name}</span>
              <span style={{ fontSize: 44, color: "#8c93c9" }}>${t.ticker}</span>
              <span style={{ fontSize: 32, color: "#c8c6ee", marginTop: 12 }}>Market cap {fmt(Number(t.market_cap_sol))} SOL</span>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 64, fontWeight: 700 }}>Le peuple frappe sa monnaie.</span>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#9b98ad" }}>
            <span>Bonding curve</span>
            <span>{t ? `${fmt(progress)} %` : "Solana"}</span>
          </div>
          <div style={{ display: "flex", width: "100%", height: 14, borderRadius: 7, background: "rgba(255,255,255,0.08)" }}>
            <div style={{ width: `${progress}%`, height: 14, borderRadius: 7, background: "linear-gradient(90deg, #545a92, #8c93c9, #f1ecfa)" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
