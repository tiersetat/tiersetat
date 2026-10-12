import "server-only";

/**
 * Accès serveur à Privy (clé secrète jamais envoyée au navigateur).
 * Sert à l'envoi par e-mail : retrouver le wallet Solana d'une adresse e-mail, ou le créer à l'avance
 * pour que la personne le récupère en se connectant avec cet e-mail. Tiers-État ne détient jamais les fonds.
 */
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const SECRET = process.env.PRIVY_APP_SECRET ?? "";

export const privyServerReady = () => Boolean(APP_ID && SECRET);

function headers() {
  return {
    Authorization: `Basic ${Buffer.from(`${APP_ID}:${SECRET}`).toString("base64")}`,
    "privy-app-id": APP_ID,
    "Content-Type": "application/json",
  };
}

type Account = { type: string; chain_type?: string; address?: string; wallet_client_type?: string; connector_type?: string };
type PrivyUser = { id: string; linked_accounts: Account[]; wallets?: Account[] };

const solanaWallet = (u: PrivyUser) =>
  [...(u.linked_accounts ?? []), ...(u.wallets ?? [])].find((a) => a.type === "wallet" && a.chain_type === "solana" && (a.wallet_client_type === "privy" || a.connector_type === "embedded"))
    ?.address ?? null;

/** Le wallet Solana de cet e-mail (créé si la personne n'a pas encore de compte). `created` = compte préparé à l'instant. */
export async function walletForEmail(email: string): Promise<{ address: string; created: boolean }> {
  const found = await fetch("https://api.privy.io/v1/users/email/address", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ address: email }),
    signal: AbortSignal.timeout(8000),
  });
  if (found.ok) {
    const user = (await found.json()) as PrivyUser;
    const address = solanaWallet(user);
    if (address) return { address, created: false };
    // Compte existant sans wallet Solana : on lui en crée un
    const res = await fetch(`https://api.privy.io/v1/users/${encodeURIComponent(user.id)}/wallets`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ wallets: [{ chain_type: "solana" }] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`privy wallet ${res.status}`);
    const updated = (await res.json()) as PrivyUser;
    const created = solanaWallet(updated);
    if (!created) throw new Error("privy: pas de wallet Solana");
    return { address: created, created: false };
  }
  if (found.status !== 404) throw new Error(`privy lookup ${found.status}`);
  const res = await fetch("https://auth.privy.io/api/v1/users", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ linked_accounts: [{ type: "email", address: email }], wallets: [{ chainType: "solana" }] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`privy create ${res.status}`);
  const user = (await res.json()) as PrivyUser;
  const address = solanaWallet(user);
  if (!address) throw new Error("privy: wallet non créé");
  return { address, created: true };
}
