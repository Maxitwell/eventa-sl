import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PREVIEW_KEY = "eventa-sl-preview-2026";
const PREVIEW_COOKIE = "eventa_preview";

export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const key = searchParams.get("key");

  // ?exit=true — clear the cookie and go back to countdown
  if (searchParams.get("exit") === "true") {
    const res = NextResponse.redirect(new URL("/coming-soon", request.url));
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }

  // ?key=... — validate and set the cookie
  if (key === PREVIEW_KEY) {
    const res = NextResponse.redirect(new URL("/", request.url));
    res.cookies.set(PREVIEW_COOKIE, PREVIEW_KEY, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return res;
  }

  // Wrong or missing key — back to countdown
  return NextResponse.redirect(new URL("/coming-soon", request.url));
}
