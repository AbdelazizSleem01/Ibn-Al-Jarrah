import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredOrigins() {
  const values = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_ORIGIN,
    process.env.ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(values);
}

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

export function isAllowedOrigin(request: Request) {
  if (SAFE_METHODS.has(request.method)) return true;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  const requestUrl = new URL(request.url);
  const sameHostOrigin = `${requestUrl.protocol}//${host}`;
  if (normalizedOrigin === sameHostOrigin) return true;

  return configuredOrigins().has(normalizedOrigin);
}

export function csrfError() {
  return NextResponse.json(
    { success: false, message: "CSRF origin check failed" },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}

export function requireCsrf(request: Request) {
  return isAllowedOrigin(request) ? null : csrfError();
}
