import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Category from "@/models/Category";

export async function GET() {
  try {
    await dbConnect();
    const categories = await Category.find({ isVisible: true })
      .sort({ displayOrder: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "تم جلب التصنيفات بنجاح",
      data: categories,
    }, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=1200",
      }
    });
  } catch (error) {
    console.error("Public Categories API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب التصنيفات" },
      { status: 500 }
    );
  }
}
