import { NextResponse } from "next/server";

export const config = {
    matcher: [
        "/((?!login|_next|favicon.ico|manifest.json|robots.txt).*)",
    ],
};

export function middleware(req) {
    const token = req.cookies.get("token")?.value;

    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("from", req.nextUrl.pathname);

        return NextResponse.redirect(url);
    }

    // If the token exists, we can proceed to the requested page
    return NextResponse.next();
}