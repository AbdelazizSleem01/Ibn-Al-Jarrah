import { NextResponse } from "next/server";

type RateLimitPolicy = {
  key: string;
  limit: number;
  windowSeconds: number;
};

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    { success: false, message: "Too many requests" },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    }
  );
}

function unavailableResponse() {
  return NextResponse.json(
    { success: false, message: "Rate limiting is not configured" },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

async function upstashLimit(key: string, policy: RateLimitPolicy) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redisKey = `rl:${key}`;
  const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, policy.windowSeconds, "NX"],
      ["TTL", redisKey],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("UPSTASH_RATE_LIMIT_FAILED");
  }

  const result = await response.json();
  const count = Number(result?.[0]?.result || 0);
  const ttl = Number(result?.[2]?.result || policy.windowSeconds);
  return count > policy.limit ? rateLimitResponse(ttl) : null;
}

function memoryLimit(key: string, policy: RateLimitPolicy) {
  const now = Date.now();
  const redisKey = `rl:${key}`;
  const current = memoryStore.get(redisKey);
  if (!current || current.resetAt <= now) {
    memoryStore.set(redisKey, {
      count: 1,
      resetAt: now + policy.windowSeconds * 1000,
    });
    return null;
  }

  current.count++;
  if (current.count > policy.limit) {
    return rateLimitResponse(Math.ceil((current.resetAt - now) / 1000));
  }
  return null;
}

export async function checkRateLimit(request: Request, policy: RateLimitPolicy) {
  const key = `${policy.key}:${clientIp(request)}`;

  try {
    const redisResult = await upstashLimit(key, policy);
    if (redisResult) return redisResult;
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  } catch {
    // Fall back to memory limit if Upstash fails
  }

  return memoryLimit(key, policy);
}

export const ratePolicies = {
  login: { key: "login", limit: 5, windowSeconds: 15 * 60 },
  checkout: { key: "checkout", limit: 10, windowSeconds: 10 * 60 },
  trackOrder: { key: "track-order", limit: 20, windowSeconds: 10 * 60 },
  adminSensitive: { key: "admin-sensitive", limit: 60, windowSeconds: 60 },
  adminImport: { key: "admin-import", limit: 10, windowSeconds: 10 * 60 },
  fileUpload: { key: "file-upload", limit: 10, windowSeconds: 10 * 60 },
};
