import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "dar_aljarrah_token";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123456";

// Rate limit configuration
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 100; // Max 100 requests per IP per minute

export default async function proxy(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  
  if (ip !== "unknown") {
    const windowData = rateLimitMap.get(ip);
    if (!windowData || now - windowData.timestamp > RATE_LIMIT_WINDOW_MS) {
      // New window for this IP
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    } else {
      // Existing window
      windowData.count++;
      if (windowData.count > MAX_REQUESTS_PER_WINDOW) {
        // Exceeded rate limit
        return NextResponse.json(
          { success: false, message: "Too Many Requests - لقد تجاوزت الحد المسموح من الطلبات، يرجى المحاولة بعد دقيقة." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }
  }

  // 2. Authentication Logic for Admin Routes
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
  matcher: [
    "/((?!_next/static|_next/image|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)).*)",
  ],
};
