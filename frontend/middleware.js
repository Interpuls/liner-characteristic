// middleware.js
import { NextResponse } from "next/server";

// File statici serviti da /public (estensioni comuni)
const PUBLIC_FILE = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|map|css|js|woff2?|ttf|otf)$/i;

export const config = {
  // Match stretto: esclude già a monte asset/static/API e file con estensione.
  // Manteniamo comunque guardie difensive dentro middleware per robustezza.
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|manifest.json|.*\\..*).*)",
  ],
};

export function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const isNextDataRequest =
    req.headers.get("x-nextjs-data") === "1" ||
    pathname.startsWith("/_next/data/");

  // Lascia passare:
  // - risorse interne di Next
  // - data requests interne di Next (JSON per client-side navigation)
  // - la pagina di login
  // - file noti (favicon/manifest/robots)
  // - QUALSIASI file statico in /public (match su estensioni)
  if (
    isNextDataRequest ||
    pathname.startsWith("/_next") ||
    pathname === "/login" ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname === "/robots.txt" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Protezione pagine: richiede cookie "token"
  const token = req.cookies.get("token")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
