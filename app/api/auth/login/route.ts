import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Admin from "@/models/Admin";
import bcrypt from "bcrypt";
import { signToken, setAuthCookie } from "@/lib/auth/token";
import { loginSchema } from "@/lib/validation/schemas";

// Simple in-memory rate limiting map
const loginAttempts = new Map<string, { count: number; lockUntil: number }>();

export async function POST(request: Request) {
  try {
    await dbConnect();

    // Rate Limiting Check
    const ip = request.headers.get("x-forwarded-for") || "local";
    const now = Date.now();
    const attempt = loginAttempts.get(ip);

    if (attempt && attempt.lockUntil > now) {
      const minutesLeft = Math.ceil((attempt.lockUntil - now) / 60000);
      return NextResponse.json(
        {
          success: false,
          message: `محاولات تسجيل دخول كثيرة خاطئة. تم قفل الحساب مؤقتاً، يرجى المحاولة بعد ${minutesLeft} دقيقة.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "بيانات الإدخال غير صحيحة", errors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Generic error message to prevent account enumeration
    const invalidCredsResponse = () => {
      // Increment rate limit attempts
      const currentCount = attempt ? attempt.count + 1 : 1;
      if (currentCount >= 5) {
        loginAttempts.set(ip, {
          count: 0,
          lockUntil: now + 15 * 60 * 1000, // 15 mins lock
        });
      } else {
        loginAttempts.set(ip, {
          count: currentCount,
          lockUntil: 0,
        });
      }

      return NextResponse.json(
        { success: false, message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    };

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return invalidCredsResponse();
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return invalidCredsResponse();
    }

    // Success - Clear rate limit attempts
    loginAttempts.delete(ip);

    // Sign Token and set HttpOnly Cookie
    const token = signToken({
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      data: {
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
