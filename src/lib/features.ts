/**
 * Fonctions soumises à un feu vert juridique, coupées par défaut.
 * Effet de levier (contrats perpétuels sur actions, indices…) : produits dérivés, hors MiCA (règles MiFID et AMF,
 * publicité très encadrée pour les particuliers). Les cours restent affichés pour information.
 */
export const LEVERAGE_ENABLED = process.env.NEXT_PUBLIC_LEVIER === "1";
