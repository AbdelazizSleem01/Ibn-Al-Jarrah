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

    // 1. Calculate all Book counts in a single aggregation pipeline facet, parallelized with Category count and recent books find.
    const [statsData, totalCategories, recentBooks] = await Promise.all([
      Book.aggregate([
        {
          $facet: {
            totalBooks: [{ $match: { isDeleted: false } }, { $count: "count" }],
            availableBooks: [{ $match: { isDeleted: false, availabilityStatus: "available" } }, { $count: "count" }],
            unavailableBooks: [{ $match: { isDeleted: false, availabilityStatus: "unavailable" } }, { $count: "count" }],
            featuredBooks: [{ $match: { isDeleted: false, isFeatured: true } }, { $count: "count" }],
            noImageBooks: [
              {
                $match: {
                  isDeleted: false,
                  $or: [
                    { "coverImage.secureUrl": { $exists: false } },
                    { "coverImage.secureUrl": "" },
                    { "coverImage.secureUrl": null },
                  ],
                },
              },
              { $count: "count" },
            ],
            softDeletedBooks: [{ $match: { isDeleted: true } }, { $count: "count" }],
          },
        },
      ]),
      Category.countDocuments(),
      Book.find({ isDeleted: false })
        .populate("categoryId", "name slug")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const facet = statsData[0] || {};
    const totalBooks = facet.totalBooks?.[0]?.count || 0;
    const availableBooks = facet.availableBooks?.[0]?.count || 0;
    const unavailableBooks = facet.unavailableBooks?.[0]?.count || 0;
    const featuredBooks = facet.featuredBooks?.[0]?.count || 0;
    const noImageBooks = facet.noImageBooks?.[0]?.count || 0;
    const softDeletedBooks = facet.softDeletedBooks?.[0]?.count || 0;

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
