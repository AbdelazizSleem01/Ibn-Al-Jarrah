import { NextResponse } from "next/server";
import { extractBookDataFromPDF } from "@/lib/utils/pdfExtractor";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { MAX_PDF_BYTES } from "@/lib/security/request";
import { requireAdmin } from "@/lib/security/request";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;
    const rateLimit = await checkRateLimit(request, ratePolicies.fileUpload);
    if (rateLimit) return rateLimit;

const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "يرجى اختيار ملف PDF" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, message: "نوع الملف يجب أن يكون PDF فقط" },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { success: false, message: "PDF file is too large" },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json(
        { success: false, message: "Invalid PDF file" },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;

        const sendEvent = (eventData: any) => {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`)
            );
          } catch (e) {
            isClosed = true;
          }
        };

        const safeClose = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (e) {
              // Controller already closed
            }
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

          safeClose();
        } catch (error: any) {
          console.error("PDF Streaming Extraction Error:", error);
          sendEvent({
            type: "error",
            message: error.message || "حدث خطأ أثناء قراءة ملف الـ PDF",
          });
          safeClose();
        }
      },
      cancel() {
        // Client aborted connection
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
