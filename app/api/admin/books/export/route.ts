import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import { isValidObjectId } from "@/lib/security/request";
import { requireAdmin } from "@/lib/security/request";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;
    const user = auth.user;

await dbConnect();
    const { searchParams } = new URL(request.url);

    const query: any = { isDeleted: false };

    // Apply category filter if specified
    const categoryId = searchParams.get("categoryId");
    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return NextResponse.json({ success: false, message: "Invalid category id" }, { status: 400 });
      }
      query.categoryId = categoryId;
    }

    // Apply featured filter if specified
    const isFeatured = searchParams.get("isFeatured");
    if (isFeatured === "true") {
      query.isFeatured = true;
    }

    // Fetch all matching books
    const books = await Book.find(query)
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean();

    // Format fields for export
    const exportData = books.map((book) => ({
      ID: book._id.toString(),
      الكتاب: book.title,
      الكاتب: book.author || "",
      الناشر: book.publisher || "",
      التصنيف: book.categoryId ? (book.categoryId as any).name : "",
      "سعر جنيه": book.prices?.egp || "",
      "سعر دينار": book.prices?.lyd || "",
      "سعر دولار": book.prices?.usd || "",
      "سعر الجملة": book.prices?.wholesale || "",
      "هامش الربح": book.prices?.profitMargin || "",
      ISBN: book.isbn || "",
      الطبعة: book.edition || "",
      "سنة النشر": book.publicationYear || "",
      "عدد الصفحات": book.pagesCount || "",
      "عدد المجلدات": book.volumesCount || 1,
      التجليد: book.coverType || "",
      المقاس: book.size || "",
      اللغة: book.language || "العربية",
      "حالة التوفر": book.availabilityStatus === "available" ? "متوفر" : "غير متوفر",
      مميز: book.isFeatured ? "نعم" : "لا",
    }));

    return NextResponse.json({
      success: true,
      message: "تم تجهيز البيانات للتصدير بنجاح",
      data: exportData,
    });
  } catch (error) {
    console.error("Export API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تصدير البيانات" },
      { status: 500 }
    );
  }
}
