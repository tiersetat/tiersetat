import type { Trust } from "@/lib/creator-trust";

const STYLE: Record<Trust["niveau"], string> = {
  nouveau: "bg-white/5 text-muted-foreground",
  fiable: "bg-achat/15 text-achat",
  mitige: "bg-soleil/15 text-soleil",
  risque: "bg-vente/15 text-vente",
};

/** Note de confiance d'un créateur, avec l'explication au survol. */
export function TrustBadge({ trust, withDetail = false }: { trust: Trust; withDetail?: boolean }) {
  return (
    <span className="inline-flex flex-col gap-1">
      <span title={trust.detail} className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[trust.niveau]}`}>
        <span aria-hidden>{trust.niveau === "fiable" ? "✓" : trust.niveau === "risque" ? "⚠" : "•"}</span>
        {trust.label}
      </span>
      {withDetail && <span className="text-xs text-muted-foreground">{trust.detail}</span>}
    </span>
  );
}
