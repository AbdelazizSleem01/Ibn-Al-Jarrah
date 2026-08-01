import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getAuthUser, type DecodedUser } from "@/lib/auth/token";
import { requireCsrf } from "@/lib/security/csrf";

export const MAX_JSON_BODY_BYTES = 1024 * 1024;
export const MAX_IMAGE_DATA_URL_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_BULK_IDS = 500;

export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export function jsonOk<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireAdmin(): Promise<
  | { user: DecodedUser; response?: never }
  | { user?: never; response: NextResponse }
>;
export async function requireAdmin(
  request: Request,
  options?: { csrf?: boolean }
): Promise<
  | { user: DecodedUser; response?: never }
  | { user?: never; response: NextResponse }
>;
export async function requireAdmin(
  request?: Request,
  options: { csrf?: boolean } = {}
) {
  if (request && options.csrf) {
    const csrfResponse = requireCsrf(request);
    if (csrfResponse) return { response: csrfResponse };
  }

  const user = await getAuthUser();
  if (!user) {
    return { response: jsonError("Unauthorized", 401) };
  }
  return { user };
}

export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<T> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("INVALID_CONTENT_TYPE");
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength && contentLength > maxBytes) {
    throw new Error("BODY_TOO_LARGE");
  }

  return (await request.json()) as T;
}

export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
}

export function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function safeRegex(value: string, maxLength = 80) {
  return new RegExp(escapeRegex(value.trim().slice(0, maxLength)), "i");
}

export function boundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function boundedNumber(value: string | null, min: number, max: number) {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

export function validateDataImage(value: unknown, maxBytes = MAX_IMAGE_DATA_URL_BYTES): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return null;
  const byteLength = Math.ceil(match[2].replace(/\s/g, "").length * 0.75);
  if (byteLength > maxBytes) return null;
  return value;
}

export function safeCloudinaryImage(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function validateAllowedIds(ids: unknown, maxIds = MAX_BULK_IDS): string[] {
  if (!Array.isArray(ids)) return [];
  const cleanIds = ids.filter(isValidObjectId).slice(0, maxIds);
  return Array.from(new Set(cleanIds));
}
