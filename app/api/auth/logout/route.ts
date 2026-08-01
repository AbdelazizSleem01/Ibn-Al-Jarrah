import { NextResponse } from "next/server";
import { removeAuthCookie } from "@/lib/auth/token";
import { requireCsrf } from "@/lib/security/csrf";

export async function POST(request: Request) {
  try {
    const csrf = requireCsrf(request);
    if (csrf) return csrf;

    await removeAuthCookie();
    return NextResponse.json({
      success: true,
      message: "تم تسجيل الخروج بنجاح",
    });
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
