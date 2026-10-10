/**
 * Organisation de l'appli, partagée par le menu du téléphone (barre du bas) et celui de l'ordinateur (barre latérale) :
 * 4 destinations + l'action principale au centre. Tout le reste est rangé dedans.
 */
export const ICONS = {
  market: "M3 17l5-5 4 4 8-8M15 8h5v5",
  fil: "M4 5h16v11H8l-4 4zM8 9h8M8 12h5",
  trophy: "M8 4h8v4a4 4 0 0 1-8 0zM6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 12v4m-4 4h8m-6-4h4v4h-4z",
  me: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  buzz: "M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9Z",
  debt: "M3 17l6-6 4 4 8-8M21 7v6h-6",
  vote: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  scroll: "M8 3h10v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2h12M8 3a3 3 0 0 0-3 3v9",
} as const;

export type NavItem = { href: string; label: string; d: string; color: string; match: string[] };

export const PRIMARY: NavItem[] = [
  { href: "/", label: "Marché", d: ICONS.market, color: "text-ciel", match: ["/marche", "/token", "/recherche", "/radar"] },
  { href: "/fil", label: "Fil", d: ICONS.fil, color: "text-bonbon", match: ["/abonnements"] },
  { href: "/classements", label: "Classement", d: ICONS.trophy, color: "text-soleil", match: ["/semaine", "/clans", "/cahiers"] },
  { href: "/portefeuille", label: "Moi", d: ICONS.me, color: "text-achat", match: ["/profil"] },
];

/** Pages « découverte » : accessibles depuis Moi (téléphone) et en bas du menu (ordinateur). */
export const DISCOVER = [
  { href: "/ca-buzz", label: "Ça buzz en France", d: ICONS.buzz },
  { href: "/dette", label: "La dette en direct", d: ICONS.debt },
  { href: "/assemblee", label: "L'Assemblée", d: ICONS.vote },
  { href: "/verifier", label: "Vérifier", d: ICONS.shield },
  { href: "/vision", label: "Vision", d: ICONS.eye },
  { href: "/manifeste", label: "Manifeste", d: ICONS.scroll },
];

export function isActive(item: NavItem, path: string): boolean {
  if (item.href === "/" ? path === "/" : path.startsWith(item.href)) return true;
  return item.match.some((m) => path.startsWith(m));
}
