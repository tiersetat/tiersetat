/** Nom affiché d'un compte : pseudo s'il existe, sinon adresse abrégée. */
export function displayName(p: { wallet: string; pseudo?: string | null }): string {
  return p.pseudo || `${p.wallet.slice(0, 4)}…${p.wallet.slice(-4)}`;
}
