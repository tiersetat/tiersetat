import Link from "next/link";
import { btcHours } from "@/lib/dashboard-data";
import { Change, Panel } from "./Panel";

const hour = (ms: number) => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const price = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Historique du Bitcoin heure par heure (bougies Hyperliquid) : prix de clôture et variation de l'heure. */
export async function BtcHistory() {
  const rows = await btcHours(8).catch(() => []);
  return (
    <Panel
      title="Bitcoin, heure par heure"
      action={
        <Link href="/crypto/bitcoin" className="chip px-3 py-1 text-xs">
          Graphique
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Historique momentanément indisponible.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-muted-foreground">
              <th className="pb-1 text-left font-medium">Clôture</th>
              <th className="pb-1 text-right font-medium">Sur l&apos;heure</th>
              <th className="pb-1 text-right font-medium">Heure</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {rows.map((r) => (
              <tr key={r.at} className="border-t border-white/[0.06]">
                <td className="py-1.5 font-semibold">{price(r.close)}</td>
                <td className="py-1.5 text-right">
                  <Change v={r.changePct} className="text-xs" />
                </td>
                <td className="py-1.5 text-right text-muted-foreground">{hour(r.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
