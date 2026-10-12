/** GIF dans la communauté : un message « [gif]https://… » s'affiche en image. Seuls Giphy et Tenor sont acceptés. */
export const GIF_PREFIX = "[gif]";

const MEDIA = /^https:\/\/(media\d*\.giphy\.com|i\.giphy\.com|media\.tenor\.com)\/[\w\-./%]+\.(gif|webp)(\?[\w=&\-.]*)?$/i;

/** Lien collé (page Giphy, lien média Giphy/Tenor) → lien direct de l'image, ou null si non reconnu. */
export function normalizeGifUrl(input: string): string | null {
  const url = input.trim();
  if (MEDIA.test(url)) return url;
  // Page Giphy : https://giphy.com/gifs/nom-du-gif-ABC123 → https://media.giphy.com/media/ABC123/giphy.gif
  const page = url.match(/^https:\/\/giphy\.com\/(?:gifs|stickers)\/(?:[\w-]*-)?([A-Za-z0-9]{8,})\/?$/);
  if (page) return `https://media.giphy.com/media/${page[1]}/giphy.gif`;
  return null;
}

/** Le lien de l'image si le message est un GIF valide. */
export function gifOf(body: string): string | null {
  if (!body.startsWith(GIF_PREFIX)) return null;
  const url = body.slice(GIF_PREFIX.length).trim();
  return MEDIA.test(url) ? url : null;
}
