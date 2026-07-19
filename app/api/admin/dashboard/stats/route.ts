import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { getAuthUser } from "@/lib/auth/token";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالدخول" },
        { status: 401 }
      );
    }

    await dbConnect();

    // 1. Calculate main counts and fetch recent books in parallel
    const [
      totalBooks,
      totalCategories,
      availableBooks,
      unavailableBooks,
      featuredBooks,
      noImageBooks,
      softDeletedBooks,
      recentBooks
    ] = await Promise.all([
      Book.countDocuments({ isDeleted: false }),
      Category.countDocuments(),
      Book.countDocuments({
        availabilityStatus: "available",
        isDeleted: false,
      }),
      Book.countDocuments({
        availabilityStatus: "unavailable",
        isDeleted: false,
      }),
      Book.countDocuments({
        isFeatured: true,
        isDeleted: false,
      }),
      Book.countDocuments({
        isDeleted: false,
        $or: [
          { "coverImage.secureUrl": { $exists: false } },
          { "coverImage.secureUrl": "" },
          { "coverImage.secureUrl": null },
        ],
      }),
      Book.countDocuments({ isDeleted: true }),
      Book.find({ isDeleted: false })
        .populate("categoryId", "name slug")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      message: "تم جلب إحصائيات لوحة التحكم بنجاح",
      data: {
        totalBooks,
        totalCategories,
        availableBooks,
        unavailableBooks,
        featuredBooks,
        noImageBooks,
        softDeletedBooks,
        recentBooks,
      },
    });
  } catch (error) {
    console.error("Dashboard Stats GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب الإحصائيات" },
      { status: 500 }
    );
  }
}
