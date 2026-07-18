import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "dar_aljarrah_token";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123456";

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  const isAdminPath = pathname.startsWith("/admin");
  const isAdminApiPath = pathname.startsWith("/api/admin");

  if (isAdminPath || isAdminApiPath) {
    if (!token) {
      if (isAdminApiPath) {
        return NextResponse.json(
          { success: false, message: "عذراً، غير مصرح بالوصول. يرجى تسجيل الدخول" },
          { status: 401 }
        );
      }
      // Redirect page requests to login
      const loginUrl = new URL("/login", request.url);
      // Remember redirect path
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const secretKey = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(token, secretKey);
      return NextResponse.next();
    } catch (error) {
      if (isAdminApiPath) {
        return NextResponse.json(
          { success: false, message: "انتهت الجلسة، يرجى تسجيل الدخول مجدداً" },
          { status: 401 }
        );
      }
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  // Redirect logged-in admin away from login page
  if (pathname === "/login" && token) {
    try {
      const secretKey = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(token, secretKey);
      return NextResponse.redirect(new URL("/admin", request.url));
    } catch (error) {
      // Invalid token, delete it
      const response = NextResponse.next();
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/login"],
};
