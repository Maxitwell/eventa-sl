import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LAUNCH_DATE = new Date("2026-05-04T00:00:00Z");
const PREVIEW_KEY = "eventa-sl-preview-2026";
const PREVIEW_COOKIE = "eventa_preview";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always let the preview activation route through
  if (pathname === "/preview") return NextResponse.next();

  if (Date.now() < LAUNCH_DATE.getTime()) {
    // If the visitor has the preview cookie, show them the real site
    if (request.cookies.get(PREVIEW_COOKIE)?.value === PREVIEW_KEY) {
      return NextResponse.next();
    }

    if (pathname !== "/coming-soon") {
      return NextResponse.redirect(new URL("/coming-soon", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all page routes; skip API, Next.js internals, static assets, PWA files
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon.svg|serwist).*)",
  ],
};
