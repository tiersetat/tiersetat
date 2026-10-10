import Link from "next/link";
import type { Heat, Trend } from "@/lib/buzz-trends";

export const HEAT_STYLE: Record<Heat, { dot: string; text: string; label: string }> = {
  brulant: { dot: "bg-vente shadow-[0_0_10px] shadow-vente", text: "text-vente", label: "Brûlant" },
  chaud: { dot: "bg-soleil shadow-[0_0_8px] shadow-amber-400/70", text: "text-soleil", label: "Chaud" },
  tiede: { dot: "bg-pervenche", text: "text-lueur", label: "Tiède" },
};

/** Sujets du moment, colorés selon leur chaleur ; un clic filtre les actus du sujet. */
export function TrendList({ trends, active }: { trends: Trend[]; active?: string | null }) {
  if (trends.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Sujets du moment">
      {trends.map((t) => {
        const style = HEAT_STYLE[t.heat];
        return (
          <li key={t.key}>
            <Link
              href={`/ca-buzz?sujet=${encodeURIComponent(t.key)}`}
              className={`chip flex items-center gap-2 ${active === t.key ? "chip-active" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <span className={`font-semibold ${style.text}`}>{t.label}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{t.sources} sources</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
