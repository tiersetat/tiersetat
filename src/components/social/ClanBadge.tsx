import Link from "next/link";
import type { Clan } from "@/lib/clans";

/** Emblème d'un clan : pastille colorée + nom (lien vers la page du clan). */
export function ClanBadge({ clan, size = "sm" }: { clan: Pick<Clan, "slug" | "name" | "hue">; size?: "sm" | "lg" }) {
  const dot = size === "lg" ? "size-3" : "size-2";
  return (
    <Link
      href={`/clans/${clan.slug}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium transition hover:brightness-125 ${size === "lg" ? "text-sm" : "text-xs"}`}
      style={{ borderColor: `hsl(${clan.hue} 60% 60% / 0.4)`, background: `hsl(${clan.hue} 60% 50% / 0.12)`, color: `hsl(${clan.hue} 80% 82%)` }}
    >
      <span className={`${dot} rounded-full`} style={{ background: `hsl(${clan.hue} 70% 60%)`, boxShadow: `0 0 8px hsl(${clan.hue} 70% 60%)` }} />
      {clan.name}
    </Link>
  );
}
