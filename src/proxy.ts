import { NextResponse, type NextRequest } from "next/server";
import { isGeoBlocked, parseExtra } from "@/lib/geo";

/** Pages toujours accessibles, même depuis un pays bloqué (informations légales). */
const ALWAYS_OPEN = ["/indisponible", "/cgu", "/mentions-legales"];

/** Filtrage par pays (en-têtes de géolocalisation fournis par Vercel). */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (ALWAYS_OPEN.some((p) => pathname === p)) return NextResponse.next();

  const country = request.headers.get("x-vercel-ip-country");
  const region = request.headers.get("x-vercel-ip-country-region");
  if (!isGeoBlocked(country, region, parseExtra(process.env.GEO_BLOCKED_EXTRA))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Tiers-État n'est pas disponible dans ton pays." }, { status: 451 });
  }
  return NextResponse.rewrite(new URL("/indisponible", request.url), { status: 451 });
}

export const config = {
  // Tout sauf les fichiers statiques, les images et les icônes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|images/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|svg|webp|ico)$).*)"],
};
