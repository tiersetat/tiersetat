/**
 * Protections d'envoi (purement préventives : un envoi sur la blockchain ne peut pas être annulé).
 * - Nouvelle adresse : confirmation « je connais ce destinataire ».
 * - Gros montant : à partir de la moitié du solde, ou d'un seuil fixe, confirmation supplémentaire.
 */
export const BIG_SEND_USD = 500;

export type SendRisk = { newRecipient: boolean; big: boolean };

export function sendRisk(opts: { recipient: string; amount: number; balance: number; amountUsd: number | null; known: string[] }): SendRisk {
  const newRecipient = Boolean(opts.recipient) && !opts.known.includes(opts.recipient);
  const big = opts.amount > 0 && (opts.amount >= opts.balance * 0.5 || (opts.amountUsd !== null && opts.amountUsd >= BIG_SEND_USD));
  return { newRecipient, big };
}

const KEY = "te_known_recipients";
export function knownRecipients(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
export function rememberRecipient(addr: string) {
  try {
    const list = [addr, ...knownRecipients().filter((a) => a !== addr)].slice(0, 50);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible */
  }
}
