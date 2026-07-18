import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123456";
const COOKIE_NAME = "dar_aljarrah_token";

export interface DecodedUser {
  id: string;
  email: string;
  name: string;
}

export function signToken(payload: DecodedUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): DecodedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedUser;
  } catch (error) {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: "/",
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAuthUser(): Promise<DecodedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
