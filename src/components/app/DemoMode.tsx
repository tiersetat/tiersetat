"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { syncDemoFromUrl } from "@/lib/demo";

/** Active ou coupe le mode démo selon l'adresse (?demo=on / ?demo=off). */
export function DemoMode() {
  const path = usePathname();
  useEffect(() => {
    syncDemoFromUrl();
  }, [path]);
  return null;
}
