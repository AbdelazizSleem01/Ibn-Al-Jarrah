import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug: rawSlug } = await params;
    await dbConnect();

    // Referencing Category model ensures Mongoose registers the schema before populate
    void Category;

    let decodedSlug = rawSlug;
    try {
      decodedSlug = decodeURIComponent(rawSlug);
    } catch {
      // Fallback if decode fails
    }

    // Query by decoded slug, raw URL-encoded slug, or ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawSlug) || /^[0-9a-fA-F]{24}$/.test(decodedSlug);
    const query = isObjectId
      ? { _id: rawSlug.match(/^[0-9a-fA-F]{24}$/) ? rawSlug : decodedSlug, isDeleted: false }
      : { $or: [{ slug: decodedSlug }, { slug: rawSlug }], isDeleted: false };

    const book = await Book.findOne(query)
      .populate("categoryId", "name slug icon")
      .lean();

    if (!book) {
      return NextResponse.json(
        { success: false, message: "الكتاب المطلوب غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم جلب تفاصيل الكتاب بنجاح",
      data: book,
    });
  } catch (error: any) {
    console.error("Book Detail GET Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "حدث خطأ أثناء جلب تفاصيل الكتاب" },
      { status: 500 }
    );
  }
}
