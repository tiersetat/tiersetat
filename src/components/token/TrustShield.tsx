import Link from "next/link";
import { trustScore, type RiskFlag } from "@/lib/risk-flags";

const TONE = {
  ok: { ring: "ring-achat/40", text: "text-achat", bg: "bg-achat/10" },
  warn: { ring: "ring-soleil/40", text: "text-soleil", bg: "bg-soleil/10" },
  danger: { ring: "ring-vente/40", text: "text-vente", bg: "bg-vente/10" },
} as const;
const ICON = { ok: "✓", warn: "!", danger: "✕" } as const;

/**
 * Bouclier Tiers-État : la note de fiabilité du token (sur 100) et chaque contrôle, lu sur la blockchain.
 * Les règles de la plateforme sont garanties ; le token lui-même reste un pari risqué.
 */
export function TrustShield({ flags }: { flags: RiskFlag[] }) {
  const t = trustScore(flags);
  const tone = TONE[t.tone];
  return (
    <section className={`space-y-4 rounded-3xl bg-surface p-5 ring-2 ${tone.ring}`} aria-label="Bouclier de fiabilité">
      <div className="flex items-center gap-4">
        <div className={`grid size-16 shrink-0 place-items-center rounded-2xl ${tone.bg}`}>
          <span className={`font-[family-name:var(--font-display)] text-2xl font-extrabold ${tone.text}`}>{t.score}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">🛡 Bouclier Tiers-État</p>
          <p className={`text-xl font-extrabold ${tone.text}`}>{t.label}</p>
          <p className="text-xs text-muted-foreground">Note sur 100, contrôles lus en direct sur la blockchain</p>
        </div>
      </div>
      <ul className="space-y-2">
        {flags.map((f) => (
          <li key={f.label} className="flex items-start gap-2.5 text-sm">
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${TONE[f.level].bg} ${TONE[f.level].text}`}>{ICON[f.level]}</span>
            <span className="min-w-0">
              <span className="font-semibold">{f.label}</span>
              <span className="block text-xs text-muted-foreground">{f.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-white/[0.07] pt-3 text-xs text-muted-foreground">
        Les règles de Tiers-État sont garanties et vérifiables ; un mème reste un pari très risqué.{" "}
        <Link href="/verifier" className="font-bold text-electrique">
          Pourquoi nous faire confiance →
        </Link>
      </p>
    </section>
  );
}
