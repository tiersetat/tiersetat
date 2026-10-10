/**
 * Organisation de l'appli (version 2, simple comme les meilleures applis de trading) :
 * Accueil, Recherche, « + » (créer un mème), Social, Profil. Partagée par le téléphone et l'ordinateur.
 */
export const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  social: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  buzz: "M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9Z",
} as const;

export type NavItem = { href: string; label: string; d: string; color: string; match: string[] };

export const PRIMARY: NavItem[] = [
  { href: "/", label: "Accueil", d: ICONS.home, color: "text-ciel", match: ["/marche", "/token"] },
  { href: "/recherche", label: "Recherche", d: ICONS.search, color: "text-soleil", match: [] },
  { href: "/fil", label: "Social", d: ICONS.social, color: "text-bonbon", match: ["/classements", "/profil"] },
  { href: "/portefeuille", label: "Profil", d: ICONS.me, color: "text-achat", match: [] },
];

/** Pages utiles mais secondaires : en bas du Profil (téléphone) et du menu (ordinateur). */
export const DISCOVER = [
  { href: "/ca-buzz", label: "Idées de mèmes", d: ICONS.buzz },
  { href: "/verifier", label: "Vérifier nos règles", d: ICONS.shield },
];

export function isActive(item: NavItem, path: string): boolean {
  if (item.href === "/" ? path === "/" : path.startsWith(item.href)) return true;
  return item.match.some((m) => path.startsWith(m));
}
