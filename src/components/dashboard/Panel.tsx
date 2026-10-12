import type { ReactNode } from "react";

/** Panneau du tableau de bord : fond bleu marine, liseré fin, titre et action optionnelle. */
export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`dash-panel min-w-0 p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Variation en pourcentage, verte ou rouge, avec flèche (la couleur n'est jamais seule à porter le sens). */
export function Change({ v, className = "" }: { v: number | null | undefined; className?: string }) {
  if (v === null || v === undefined || !Number.isFinite(v)) return <span className={`text-muted-foreground ${className}`}>—</span>;
  const up = v >= 0;
  return (
    <span className={`whitespace-nowrap font-mono tabular-nums font-semibold ${up ? "text-achat" : "text-vente"} ${className}`}>
      {up ? "▲" : "▼"} {up ? "+" : "−"}
      {Math.abs(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
    </span>
  );
}

/** Prix complet façon terminal ($83,297.00) ; les tout petits prix gardent 3 chiffres significatifs. */
export function fullPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${n.toPrecision(3)}`;
}
