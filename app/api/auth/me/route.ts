import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/token";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مسجل الدخول أو انتهت الجلسة" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم جلب بيانات الجلسة بنجاح",
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Auth Me API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
