import type { Metadata } from "next";
import { FeedView } from "@/components/social/FeedView";
import { getFeed, type FeedItem } from "@/lib/feed";
import { CLUSTER } from "@/lib/solana/config";

export const metadata: Metadata = { title: "Le fil — Tiers-État" };

export default async function FilPage() {
  let initial: FeedItem[] = [];
  try {
    initial = await getFeed({ type: "tout", minUsd: 0, wallets: null });
  } catch (err) {
    console.error("fil", err);
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-4xl font-extrabold">Le fil</h1>
        <p className="text-sm text-muted-foreground">
          Les achats, les ventes et les thèses des traders, en direct. Une thèse, c&apos;est l&apos;avis d&apos;un détenteur, affiché avec sa position et son gain ou sa perte.
          {(CLUSTER as string) === "devnet" ? " Bêta : montants fictifs." : ""}
        </p>
      </header>
      <FeedView initial={initial} />
    </div>
  );
}
