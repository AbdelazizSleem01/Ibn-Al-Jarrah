import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Admin from "@/models/Admin";
import bcrypt from "bcrypt";
import { getAuthUser, signToken, setAuthCookie } from "@/lib/auth/token";
import { adminPasswordSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "عذراً، يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    await dbConnect();
    const body = await request.json();
    const result = adminPasswordSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "بيانات الإدخال غير صحيحة", errors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    const admin = await Admin.findById(user.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "كلمة المرور الحالية غير صحيحة", errors: { currentPassword: ["كلمة المرور الحالية غير صحيحة"] } },
        { status: 400 }
      );
    }

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    // Re-sign token and refresh cookie to ensure session safety
    const token = signToken({
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح",
    });
  } catch (error) {
    console.error("Password Update API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
