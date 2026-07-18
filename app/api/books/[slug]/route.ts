import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;
    await dbConnect();

    // Query by slug or fall back to ID if slug matches MongoDB ObjectId regex
    const query = slug.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: slug, isDeleted: false }
      : { slug, isDeleted: false };

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
  } catch (error) {
    console.error("Book Detail GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب تفاصيل الكتاب" },
      { status: 500 }
    );
  }
}
