import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import SiteSettings from "@/models/SiteSettings";

export async function GET() {
  try {
    await dbConnect();

    // 1. Fetch site settings
    let settings = await SiteSettings.findOne({ key: "main_settings" }).lean();
    if (!settings) {
      // Return defaults if not initialized yet
      settings = new SiteSettings({ key: "main_settings" }).toObject();
    }

    // 2. Fetch categories (only visible, sorted)
    const categories = await Category.find({ isVisible: true })
      .sort({ displayOrder: 1 })
      .lean();

    // 3. Fetch featured books (limit 8)
    const featuredBooks = await Book.find({ isFeatured: true, isDeleted: false })
      .populate("categoryId", "name slug icon")
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(8)
      .lean();

    // 4. Fetch latest books (limit 8)
    const latestBooks = await Book.find({ isDeleted: false })
      .populate("categoryId", "name slug icon")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return NextResponse.json({
      success: true,
      message: "تم جلب بيانات الصفحة الرئيسية بنجاح",
      data: {
        settings,
        categories,
        featuredBooks,
        latestBooks,
      },
    });
  } catch (error) {
    console.error("Public Home API GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب بيانات الصفحة الرئيسية" },
      { status: 500 }
    );
  }
}
