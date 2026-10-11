"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { syncDemoFromUrl } from "@/lib/demo";
import { syncThemeFromUrl } from "@/lib/theme";

/** Active ou coupe le mode démo (?demo=on / ?demo=off) et le thème d'essai (?theme=marine / ?theme=ciel) selon l'adresse. */
export function DemoMode() {
  const path = usePathname();
  useEffect(() => {
    syncDemoFromUrl();
    syncThemeFromUrl();
  }, [path]);
  return null;
}
