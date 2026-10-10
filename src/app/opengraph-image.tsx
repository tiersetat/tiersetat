import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Tiers-État — Le launchpad des mèmes français";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image de partage de l'accueil. */
export default async function Image() {
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/images/logo.png"))).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "radial-gradient(900px 520px at 50% 20%, rgba(61,90,254,0.4), #0b0d2a 70%)",
          color: "#f4f1fa",
          fontFamily: "sans-serif",
        }}
      >
        { }
        <img src={logo} width={170} height={170} alt="" />
        <span style={{ fontSize: 78, fontWeight: 700 }}>Le launchpad des mèmes français.</span>
        <span style={{ fontSize: 34, color: "#c8c6ee" }}>Le peuple frappe sa monnaie · Solana</span>
      </div>
    ),
    size,
  );
}
