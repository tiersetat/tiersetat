import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/server";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://tiersetat.vercel.app", pub, priv);
  configured = true;
  return true;
}

/** Anti-spam : une même alerte (clé) au plus une fois par fenêtre, par instance serveur. */
const lastSent = new Map<string, number>();
export function throttled(key: string, windowMs: number): boolean {
  const now = Date.now();
  const prev = lastSent.get(key);
  if (prev && now - prev < windowMs) return true;
  lastSent.set(key, now);
  if (lastSent.size > 5000) for (const [k, t] of lastSent) if (now - t > 3_600_000) lastSent.delete(k);
  return false;
}

/** Envoie une notification à tous les appareils des wallets donnés ; supprime les abonnements expirés. */
export async function sendPush(wallets: string[], payload: PushPayload): Promise<number> {
  if (wallets.length === 0 || !configure()) return 0;
  const db = supabaseAdmin();
  const { data } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").in("wallet", [...new Set(wallets)]).limit(1000);
  let sent = 0;
  await Promise.all(
    (data ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
  return sent;
}
