/**
 * Moments de fête : confettis (bleu, blanc, rouge et pervenche) et vibration du téléphone.
 * Rien ne s'affiche si l'utilisateur a demandé à réduire les animations.
 */
const COLORS = ["#002395", "#f4f1fa", "#ed2939", "#8c93c9", "#c8c6ee"];

export async function celebrate(kind: "launch" | "buy" | "sell") {
  if (typeof window === "undefined") return;
  try {
    navigator.vibrate?.(kind === "launch" ? [30, 60, 30, 60, 80] : [25, 40, 25]);
  } catch {
    /* vibration indisponible */
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || kind === "sell") return;
  const confetti = (await import("canvas-confetti")).default;
  const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 9999 };
  if (kind === "launch") {
    confetti({ ...base, particleCount: 160, spread: 100, startVelocity: 45, origin: { y: 0.6 } });
    setTimeout(() => confetti({ ...base, particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } }), 250);
    setTimeout(() => confetti({ ...base, particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } }), 400);
  } else {
    confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 35, origin: { y: 0.75 } });
  }
}
