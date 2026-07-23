import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import SiteSettings from "@/models/SiteSettings";
import { getCachedSettings } from "@/lib/db/settingsCache";

export async function GET() {
  try {
    await dbConnect();

    // Fetch settings, categories, featured, and latest books in parallel (cached settings)
    let [settings, categories, featuredBooks, latestBooks] = await Promise.all([
      getCachedSettings(),
      Category.find({ isVisible: true }).sort({ displayOrder: 1 }).lean(),
      Book.find({ isFeatured: true, isDeleted: false })
        .populate("categoryId", "name slug icon")
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(8)
        .lean(),
      Book.find({ isDeleted: false })
        .populate("categoryId", "name slug icon")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    if (!settings) {
      // Return defaults if not initialized yet
      settings = new SiteSettings({ key: "main_settings" }).toObject();
    }

    return NextResponse.json({
      success: true,
      message: "تم جلب بيانات الصفحة الرئيسية بنجاح",
      data: {
        settings,
        categories,
        featuredBooks,
        latestBooks,
      },
    }, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=1200",
      }
    });
  } catch (error) {
    console.error("Public Home API GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب بيانات الصفحة الرئيسية" },
      { status: 500 }
    );
  }
}
