import type { Metadata } from "next";
import Link from "next/link";
import { FeedView } from "@/components/social/FeedView";
import { LiveActivity } from "@/components/social/LiveActivity";
import { ActivityLeaderboard } from "@/components/rank/ActivityLeaderboard";
import { topTraders } from "@/lib/leaderboards";
import { CommunityList } from "@/components/community/CommunityList";
import { listCommunities } from "@/lib/community-data";

export const metadata: Metadata = { title: "Social — Tiers-État" };

const VUES = [
  { key: "fil", label: "Le fil" },
  { key: "communautes", label: "Communautés" },
  { key: "classement", label: "Classement" },
  { key: "theses", label: "Thèses" },
] as const;

/** Social : qui achète (Mondial / Amis), les communautés des mèmes, le classement des membres par activité, et les thèses. */
export default async function SocialPage({ searchParams }: PageProps<"/fil">) {
  const raw = (await searchParams).vue;
  const vue = VUES.find((v) => v.key === raw)?.key ?? "fil";
  const rows = vue === "classement" ? await topTraders().catch(() => []) : [];
  const communities = vue === "communautes" ? await listCommunities().catch(() => []) : [];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl font-extrabold">Social</h1>
      <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.08] px-4" aria-label="Social">
        {VUES.map((v) => (
          <Link
            key={v.key}
            href={v.key === "fil" ? "/fil" : `/fil?vue=${v.key}`}
            aria-current={vue === v.key ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 pb-2.5 text-[15px] font-bold ${vue === v.key ? "border-pervenche text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>
      {vue === "fil" && <LiveActivity limit={40} />}
      {vue === "communautes" && <CommunityList items={communities} />}
      {vue === "classement" && <ActivityLeaderboard rows={rows} />}
      {vue === "theses" && (
        <>
          <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs text-muted-foreground">
            Les thèses sont les opinions personnelles des membres, pas des conseils en investissement ni des recommandations de Tiers-État. Les memecoins sont très risqués.
          </p>
          <FeedView initial={[]} defaultType="theses" />
        </>
      )}
    </div>
  );
}
