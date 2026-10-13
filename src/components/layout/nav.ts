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
  markets: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  star: "m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z",
  news: "M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5",
  wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h1",
  chart: "M3 3v18h18M7 15l4-5 3 3 5-7",
  flag: "M5 21V4M5 4h12l-2 4 2 4H5",
} as const;

export type NavItem = { href: string; label: string; d: string; color: string; match: string[] };

export const PRIMARY: NavItem[] = [
  { href: "/", label: "Accueil", d: ICONS.home, color: "text-ciel", match: ["/marche", "/token"] },
  { href: "/recherche", label: "Recherche", d: ICONS.search, color: "text-soleil", match: [] },
  { href: "/fil", label: "Social", d: ICONS.social, color: "text-bonbon", match: ["/classements", "/profil"] },
  { href: "/portefeuille", label: "Profil", d: ICONS.me, color: "text-achat", match: [] },
];

/** Menu latéral de l'ordinateur (tableau de bord) : les mêmes pages, rangées comme un terminal de marché. */
export const SIDEBAR: NavItem[] = [
  { href: "/", label: "Accueil", d: ICONS.home, color: "text-ciel", match: [] },
  { href: "/?tri=cryptos#tokens", label: "Marchés", d: ICONS.markets, color: "text-ciel", match: ["/marche", "/bourse", "/token"] },
  { href: "/?tri=liste#tokens", label: "Ma watchlist", d: ICONS.star, color: "text-ciel", match: [] },
  { href: "/ca-buzz", label: "Actualités", d: ICONS.news, color: "text-ciel", match: [] },
  { href: "/portefeuille", label: "Portefeuille", d: ICONS.wallet, color: "text-ciel", match: [] },
  { href: "/crypto/bitcoin", label: "Graphiques", d: ICONS.chart, color: "text-ciel", match: [] },
  { href: "/fil", label: "Social", d: ICONS.social, color: "text-ciel", match: ["/communaute", "/profil", "/semaine"] },
  { href: "/recherche", label: "Recherche", d: ICONS.search, color: "text-ciel", match: [] },
  { href: "/qg", label: "Le QG", d: ICONS.flag, color: "text-ciel", match: [] },
];

/** Pages utiles mais secondaires : en bas du Profil (téléphone) et du menu (ordinateur). */
export const DISCOVER = [
  { href: "/ca-buzz", label: "Idées de mèmes", d: ICONS.buzz },
];

export function isActive(item: NavItem, path: string): boolean {
  if (item.href === "/" ? path === "/" : path.startsWith(item.href)) return true;
  return item.match.some((m) => path.startsWith(m));
}
