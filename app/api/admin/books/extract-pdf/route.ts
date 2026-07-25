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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (eventData: any) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`)
            );
          } catch (e) {
            console.error("Stream enqueue error:", e);
          }
        };

        try {
          // Event 1: Initial PDF Reception
          sendEvent({
            type: "progress",
            percent: 10,
            status: "تم استقبال الملف وجاري تفكيك محتويات صفحات الـ PDF...",
          });

          // Run PDF Extractor with live progress callback
          const extractedData = await extractBookDataFromPDF(
            buffer,
            (percent: number, status: string) => {
              sendEvent({ type: "progress", percent, status });
            }
          );

          // Event 2: Completion
          sendEvent({
            type: "complete",
            percent: 100,
            status: "تم التحليل بنجاح 100%!",
            data: extractedData,
            fileName: file.name,
          });

          controller.close();
        } catch (error: any) {
          console.error("PDF Streaming Extraction Error:", error);
          sendEvent({
            type: "error",
            message: error.message || "حدث خطأ أثناء قراءة ملف الـ PDF",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("PDF Extraction API Global Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
