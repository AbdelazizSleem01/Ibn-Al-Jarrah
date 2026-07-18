import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Admin from "@/models/Admin";
import bcrypt from "bcrypt";
import { getAuthUser, signToken, setAuthCookie } from "@/lib/auth/token";
import { adminProfileSchema } from "@/lib/validation/schemas";

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
    const result = adminProfileSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "بيانات الإدخال غير صحيحة", errors },
        { status: 400 }
      );
    }

    const { name, email, currentPassword } = result.data;

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

    // Check if new email is taken by another account
    if (email.toLowerCase() !== admin.email.toLowerCase()) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return NextResponse.json(
          { success: false, message: "البريد الإلكتروني الجديد مستخدم بالفعل من قبل حساب آخر", errors: { email: ["البريد الإلكتروني الجديد مستخدم بالفعل"] } },
          { status: 400 }
        );
      }
    }

    // Update profile
    admin.name = name;
    admin.email = email.toLowerCase();
    await admin.save();

    // Re-sign token with updated info and set cookie
    const token = signToken({
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      message: "تم تحديث الملف الشخصي بنجاح",
      data: {
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Profile Update API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ غير متوقع في الخادم" },
      { status: 500 }
    );
  }
}
