import type { RiskFlag } from "@/lib/risk-flags";

const STYLE: Record<RiskFlag["level"], { dot: string; text: string }> = {
  ok: { dot: "bg-achat", text: "text-foreground" },
  warn: { dot: "bg-amber-300", text: "text-amber-200" },
  danger: { dot: "bg-vente", text: "text-vente" },
};

/** Bouclier anti-arnaque : indicateurs lus sur la blockchain, du plus grave au plus rassurant. */
export function RiskPanel({ flags }: { flags: RiskFlag[] }) {
  const order = { danger: 0, warn: 1, ok: 2 };
  const sorted = [...flags].sort((a, b) => order[a.level] - order[b.level]);
  const alerts = flags.filter((f) => f.level !== "ok").length;
  return (
    <section className="surface space-y-3 p-5" aria-labelledby="risk-panel-title">
      <div className="flex items-center justify-between">
        <h2 id="risk-panel-title" className="font-semibold">Transparence</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${alerts ? "bg-amber-300/15 text-amber-200" : "bg-achat/15 text-achat"}`}>
          {alerts ? `${alerts} point${alerts > 1 ? "s" : ""} d'attention` : "Aucune alerte"}
        </span>
      </div>
      <ul className="space-y-2.5">
        {sorted.map((f) => (
          <li key={f.label} className="flex gap-3">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${STYLE[f.level].dot}`} aria-hidden />
            <div>
              <p className={`text-sm font-medium ${STYLE[f.level].text}`}>{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-ligne pt-3 text-[11px] text-muted-foreground/80">
        Données lues sur la blockchain, mises à jour chaque minute. Elles ne garantissent rien : un memecoin reste très risqué.
      </p>
    </section>
  );
}
