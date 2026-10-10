import type { Metadata } from "next";
import Link from "next/link";
import { FeedView } from "@/components/social/FeedView";
import { LiveActivity } from "@/components/social/LiveActivity";
import { PnlLeaderboard } from "@/components/rank/PnlLeaderboard";
import { topTradersByPnl } from "@/lib/pnl-leaderboard";

export const metadata: Metadata = { title: "Social — Tiers-État" };

const VUES = [
  { key: "fil", label: "Le fil" },
  { key: "classement", label: "Classement" },
  { key: "theses", label: "Thèses" },
] as const;

/** Social : qui achète (Mondial / Amis), le classement des traders par gains, et les thèses. */
export default async function SocialPage({ searchParams }: PageProps<"/fil">) {
  const raw = (await searchParams).vue;
  const vue = VUES.find((v) => v.key === raw)?.key ?? "fil";
  const rows = vue === "classement" ? await topTradersByPnl(50).catch(() => []) : [];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-4xl font-extrabold">Social</h1>
      <nav className="flex gap-1 border-b border-white/[0.08]" aria-label="Social">
        {VUES.map((v) => (
          <Link
            key={v.key}
            href={v.key === "fil" ? "/fil" : `/fil?vue=${v.key}`}
            aria-current={vue === v.key ? "page" : undefined}
            className={`border-b-2 px-3 pb-2.5 text-[15px] font-bold ${vue === v.key ? "border-soleil text-foreground" : "border-transparent text-muted-foreground"}`}
          >
            {v.label}
          </Link>
        ))}
      </nav>
      {vue === "fil" && <LiveActivity limit={40} />}
      {vue === "classement" && <PnlLeaderboard rows={rows} />}
      {vue === "theses" && <FeedView initial={[]} defaultType="theses" />}
    </div>
  );
}
