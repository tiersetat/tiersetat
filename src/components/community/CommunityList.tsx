import Link from "next/link";
import { gifOf } from "@/lib/gif";
import type { Community } from "@/lib/community-data";

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto", style: "narrow" });
function ago(ms: number) {
  const s = (ms - Date.now()) / 1000;
  if (Math.abs(s) < 60) return "maintenant";
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

/** La liste des communautés, façon messagerie : image du mème, dernier message, membres. */
export function CommunityList({ items }: { items: Community[] }) {
  if (items.length === 0) {
    return (
      <div className="surface space-y-3 p-8 text-center">
        <p className="font-bold">Pas encore de communauté</p>
        <p className="text-sm text-muted-foreground">Chaque mème créé ouvre sa communauté : son créateur et tous ses traders s&apos;y retrouvent.</p>
        <Link href="/lancer" className="btn-fete inline-flex">
          Créer un mème
        </Link>
      </div>
    );
  }
  return (
    <ul className="surface divide-y divide-ligne overflow-hidden">
      {items.map((c) => {
        const gif = c.lastMessage ? gifOf(c.lastMessage.body) : null;
        return (
          <li key={c.mint}>
            <Link href={`/communaute/${c.mint}`} className="ios-press flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04]">
              {/* eslint-disable-next-line @next/next/no-img-element -- image IPFS du mème */}
              <img src={c.image_url} alt="" className="size-12 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-bold">
                    {c.name} <span className="font-mono text-xs font-semibold text-pervenche">${c.ticker}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>
                    {ago(c.lastActivity)}
                  </span>
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.lastMessage ? (gif ? "GIF" : c.lastMessage.body) : "Communauté ouverte, personne n'a encore parlé"}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {c.members} membre{c.members > 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
