import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "dar_aljarrah_token";
const MIN_SECRET_LENGTH = 32;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

export interface DecodedUser {
  id: string;
  email: string;
  name: string;
}

export function signToken(payload: DecodedUser): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): DecodedUser | null {
  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    }) as DecodedUser;
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
