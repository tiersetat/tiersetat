import Link from "next/link";
import { gifOf } from "@/lib/gif";
import { qgMembers } from "@/lib/qg-data";
import { supabasePublic } from "@/lib/supabase/public";

/** Sur la page d'un mème : un aperçu de sa communauté (membres, derniers messages) et l'entrée. */
export async function CommunityTeaser({ mint, ticker }: { mint: string; ticker: string }) {
  const [members, { data }] = await Promise.all([
    qgMembers(mint).catch(() => 0),
    supabasePublic()
      .from("comments")
      .select("id, body, profiles!comments_author_wallet_fkey(pseudo)")
      .eq("mint", mint)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(3)
      .returns<{ id: number; body: string; profiles: { pseudo: string | null } | null }[]>(),
  ]);
  return (
    <section className="surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Communauté ${ticker}</h2>
          <p className="text-sm text-muted-foreground">
            Le créateur et tous les traders du mème · {members} membre{members > 1 ? "s" : ""}
          </p>
        </div>
      </div>
      {data && data.length > 0 && (
        <ul className="space-y-1.5">
          {data.map((m) => (
            <li key={m.id} className="truncate rounded-xl bg-white/[0.05] px-3 py-2 text-sm">
              <span className="font-bold">{m.profiles?.pseudo ?? "Anonyme"} : </span>
              <span className="text-muted-foreground">{gifOf(m.body) ? "GIF" : m.body}</span>
            </li>
          ))}
        </ul>
      )}
      <Link href={`/communaute/${mint}`} className="btn-fete w-full">
        Rejoindre la communauté
      </Link>
    </section>
  );
}
