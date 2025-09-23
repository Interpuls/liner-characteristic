// middleware.js
import { NextResponse } from "next/server";

// File statici serviti da /public (estensioni comuni)
const PUBLIC_FILE = /\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|map|css|js|woff2?|ttf|otf)$/i;

export const config = {
  // Applichiamo il middleware a tutto; gli skip li gestiamo dentro
  matcher: "/:path*",
};

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // Lascia passare:
  // - risorse interne di Next
  // - la pagina di login
  // - file noti (favicon/manifest/robots)
  // - QUALSIASI file statico in /public (match su estensioni)
  if (
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
