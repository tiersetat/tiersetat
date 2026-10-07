/** Avatar d'un compte : image IPFS si définie, sinon pastille dégradée avec l'initiale. */
export function Avatar({ wallet, pseudo, url, size = 40 }: { wallet: string; pseudo?: string | null; url?: string | null; size?: number }) {
  const initial = (pseudo || wallet).slice(0, 1).toUpperCase();
  // Teinte stable dérivée de l'adresse
  const hue = [...wallet].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- avatar IPFS
    <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full border border-ligne object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full border border-ligne font-semibold text-white/90"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${hue} 45% 45%), hsl(${(hue + 60) % 360} 50% 25%))`,
      }}
    >
      {initial}
    </span>
  );
}
