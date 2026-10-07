"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { pseudoSchema } from "@/lib/validators";
import { Avatar } from "./Avatar";

/** Bouton « Modifier le profil » + fenêtre d'édition (visible uniquement sur son propre profil). */
export function ProfileEditor({ wallet }: { wallet: string }) {
  const router = useRouter();
  const { profile, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => (avatar ? URL.createObjectURL(avatar) : null), [avatar]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  if (profile?.wallet !== wallet) return null;

  function openEditor() {
    setPseudo(profile?.pseudo ?? "");
    setBio(profile?.bio ?? "");
    setAvatar(null);
    setRemoveAvatar(false);
    setError(null);
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (pseudo && !pseudoSchema.safeParse(pseudo).success) {
      return setError("Pseudo : 3 à 24 lettres, chiffres, « _ », « . » ou « - », sans espace.");
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("pseudo", pseudo.trim());
      form.set("bio", bio.trim());
      if (avatar) form.set("avatar", avatar);
      if (removeAvatar) form.set("removeAvatar", "1");
      const res = await fetch("/api/profile", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Enregistrement impossible");
      await refresh();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const shownAvatar = removeAvatar ? null : (preview ?? profile.avatar_url);

  return (
    <>
      <button type="button" className="btn-ghost" onClick={openEditor}>
        Modifier le profil
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="edit-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={save} className="w-full max-w-md space-y-4 rounded-2xl border border-ligne bg-popover p-6">
            <h2 id="edit-title" className="text-lg font-semibold">Modifier le profil</h2>
            <div className="flex items-center gap-4">
              <Avatar wallet={wallet} pseudo={pseudo} url={shownAvatar} size={64} />
              <div className="space-y-1.5 text-sm">
                <label className="btn-ghost cursor-pointer px-3 py-1.5 text-xs">
                  Changer l&apos;avatar
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      setAvatar(e.target.files?.[0] ?? null);
                      setRemoveAvatar(false);
                    }}
                  />
                </label>
                {(profile.avatar_url || avatar) && !removeAvatar && (
                  <button type="button" className="block text-xs text-muted-foreground hover:text-vente" onClick={() => { setAvatar(null); setRemoveAvatar(true); }}>
                    Retirer l&apos;avatar
                  </button>
                )}
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Pseudo</span>
              <input className="field" value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={24} placeholder="sans_culotte" />
            </label>
            <label className="block space-y-1.5">
              <span className="flex justify-between text-sm font-medium">
                Bio <span className="text-xs font-normal text-muted-foreground">{bio.length}/280</span>
              </span>
              <textarea className="field min-h-20" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} placeholder="Quelques mots sur toi" />
            </label>
            {error && <p className="text-sm text-vente">{error}</p>}
            <div className="flex gap-3">
              <button type="button" className="btn-ghost flex-1" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={busy}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
