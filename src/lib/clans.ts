export type Clan = { slug: string; name: string; hue: number; sort_order?: number };

/** Délai minimal entre deux changements de clan (évite de « sauter » vers le clan en tête). */
export const CLAN_COOLDOWN_DAYS = 7;

export function canChangeClan(joinedAt: string | null, now = Date.now()): boolean {
  if (!joinedAt) return true;
  return now - Date.parse(joinedAt) >= CLAN_COOLDOWN_DAYS * 24 * 3600 * 1000;
}

export function nextChangeDate(joinedAt: string): Date {
  return new Date(Date.parse(joinedAt) + CLAN_COOLDOWN_DAYS * 24 * 3600 * 1000);
}
