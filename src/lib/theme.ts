/**
 * Thème d'essai « bleu marine » : fond bleu nuit uni, boutons transparents teintés de bleu.
 * Activé seulement sur l'appareil qui ouvre « ?theme=marine » (retour au ciel étoilé : « ?theme=ciel »).
 */
const KEY = "te_theme";

export function syncThemeFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get("theme");
    if (v === "marine") localStorage.setItem(KEY, "marine");
    if (v === "ciel") localStorage.removeItem(KEY);
    document.documentElement.classList.toggle("marine", localStorage.getItem(KEY) === "marine");
  } catch {
    /* stockage indisponible : thème par défaut */
  }
}

/** Script lancé avant l'affichage, pour éviter un éclair du ciel étoilé quand le thème marine est choisi. */
export const THEME_BOOT = `try{var v=new URLSearchParams(location.search).get("theme");if(v==="marine")localStorage.setItem("${KEY}","marine");if(v==="ciel")localStorage.removeItem("${KEY}");if(localStorage.getItem("${KEY}")==="marine")document.documentElement.classList.add("marine")}catch(e){}`;
