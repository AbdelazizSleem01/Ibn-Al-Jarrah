import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/token";
import { extractBookDataFromPDF } from "@/lib/utils/pdfExtractor";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالدخول" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "يرجى اختيار ملف PDF" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { success: false, message: "نوع الملف يجب أن يكون PDF فقط" },
        { status: 400 }
      );
    }

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract book data from PDF
    const extractedData = await extractBookDataFromPDF(buffer);

    return NextResponse.json({
      success: true,
      message: "تم قراءة واستخراج بيانات ملف الـ PDF بنجاح",
      data: extractedData,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("PDF Extraction API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء قراءة ملف الـ PDF" },
      { status: 500 }
    );
  }
}
