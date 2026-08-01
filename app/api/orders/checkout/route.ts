import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";
import Book from "@/models/Book";
import { uploadImage } from "@/lib/cloudinary/upload";
import {
  isValidObjectId,
  readJsonBody,
  safeCloudinaryImage,
  validateDataImage,
} from "@/lib/security/request";
import { requireCsrf } from "@/lib/security/csrf";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

const ALLOWED_CURRENCIES = new Set(["EGP", "LYD", "USD"]);
const ALLOWED_PAYMENT_METHODS = new Set(["vodafone_cash", "instapay", "cash_on_delivery", "bank_transfer"]);

export async function POST(request: Request) {
  try {
    const csrf = requireCsrf(request);
    if (csrf) return csrf;

    const rateLimit = await checkRateLimit(request, ratePolicies.checkout);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const body = await readJsonBody<any>(request, 2 * 1024 * 1024);

    const {
      customerName,
      customerPhone,
      customerAltPhone,
      governorate,
      cityOrArea,
      detailedAddress,
      notes,
      items, // Array of { bookId, quantity }
      paymentMethod, // 'vodafone_cash' | 'instapay' | 'cash_on_delivery' | 'bank_transfer'
      paymentSenderInfo,
      paymentReceiptImage,
      currency = "EGP",
    } = body;
    const safeCurrency = ALLOWED_CURRENCIES.has(String(currency).toUpperCase())
      ? String(currency).toUpperCase()
      : "EGP";
    const safePaymentMethod = ALLOWED_PAYMENT_METHODS.has(paymentMethod)
      ? paymentMethod
      : "vodafone_cash";

    // Validation
    if (!customerName || !customerPhone || !governorate || !detailedAddress) {
      return NextResponse.json(
        { success: false, message: "جميع حقول بيانات العميل الأساسية مطلوبة (الاسم، الهاتف، المحافظة، العنوان)" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json(
        { success: false, message: "يجب اختيار كتاب واحد على الأقل للطلب" },
        { status: 400 }
      );
    }

    // Process order items & compute totals & total weight
    const processedItems = [];
    let subtotal = 0;
    let totalProfit = 0;
    let totalWeightKg = 0;

    for (const item of items) {
      if (!isValidObjectId(item?.bookId)) {
        return NextResponse.json(
          { success: false, message: "Ø£Ø­Ø¯ Ø¹Ù†Ø§ØµØ± Ø§Ù„Ø·Ù„Ø¨ ØºÙŠØ± ØµØ§Ù„Ø­" },
          { status: 400 }
        );
      }
      const book = await Book.findById(item.bookId);
      if (!book || book.isDeleted) {
        return NextResponse.json(
          { success: false, message: `الكتاب المطلوبة تفاصيله غير موجود أو تم حذفه` },
          { status: 404 }
        );
      }

      const qty = Math.min(99, Math.max(1, Number.parseInt(String(item.quantity || "1"), 10) || 1));
      const volumes = Math.max(1, Number(book.volumesCount) || 1);
      const itemWeight = qty * volumes;
      totalWeightKg += itemWeight;
      
      // Determine unit price based on currency
      let unitPrice = 0;
      if (safeCurrency === "LYD") {
        unitPrice = book.prices?.lyd || 0;
      } else if (safeCurrency === "USD") {
        unitPrice = book.prices?.usd || 0;
      } else {
        unitPrice = book.prices?.egp || 0;
      }

      const wholesalePrice = book.prices?.wholesale || 0;
      const itemTotalPrice = unitPrice * qty;
      
      // Calculate profit for this item
      const itemProfit = (unitPrice - wholesalePrice) * qty;

      subtotal += itemTotalPrice;
      totalProfit += itemProfit;

      processedItems.push({
        bookId: book._id,
        title: book.title,
        slug: book.slug,
        coverImage: book.coverImage?.secureUrl || "",
        price: unitPrice,
        wholesalePrice: wholesalePrice,
        quantity: qty,
        totalPrice: itemTotalPrice,
        currency: safeCurrency,
      });
    }

    // Calculate smart shipping cost based on governorate & total weight
    let computedShipping = 0;
    if (safeCurrency === "EGP" && governorate) {
      try {
        const { default: ShippingRate } = await import("@/models/ShippingRate");
        const govRate = await ShippingRate.findOne({ governorate: governorate.trim(), isActive: true });
        if (govRate) {
          const extraKg = totalWeightKg > 1 ? totalWeightKg - 1 : 0;
          computedShipping = govRate.baseCost + (extraKg * govRate.extraKgCost);
        }
      } catch (err) {
        console.error("Error computing dynamic shipping rate:", err);
      }
    }

    const numericShipping = computedShipping;
    const grandTotal = subtotal + numericShipping;

    // Process payment receipt image - fire and forget (non-blocking)
    // Save order immediately without waiting for Cloudinary upload
    let finalReceiptImage = "";
    let pendingBase64Receipt = "";
    
    if (paymentReceiptImage && validateDataImage(paymentReceiptImage)) {
      // Store for async upload after order is saved
      pendingBase64Receipt = paymentReceiptImage;
    } else if (paymentReceiptImage) {
      finalReceiptImage = safeCloudinaryImage(paymentReceiptImage);
    }

    // Generate Order Code (e.g. IJ-84291)
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `IJ-${randomSuffix}`;

    const newOrder = await Order.create({
      orderNumber,
      customerName,
      customerPhone,
      customerAltPhone: customerAltPhone || "",
      governorate,
      cityOrArea: cityOrArea || "",
      detailedAddress,
      notes: notes || "",
      items: processedItems,
      subtotal,
      shippingCost: numericShipping,
      grandTotal,
      totalProfit,
      currency: safeCurrency,
      paymentMethod: safePaymentMethod,
      paymentStatus: "pending",
      paymentSenderInfo: paymentSenderInfo || "",
      paymentReceiptImage: finalReceiptImage,
      orderStatus: "pending",
      isReadByAdmin: false,
    });

    // Fire-and-forget: upload receipt image in the background after order is already saved
    if (pendingBase64Receipt) {
      const orderId = newOrder._id;
      uploadImage(pendingBase64Receipt, "elgrah/receipts")
        .then((uploadRes) => {
          Order.findByIdAndUpdate(orderId, { paymentReceiptImage: uploadRes.secureUrl }).catch(() => {});
        })
        .catch((err) => {
          console.error("Background receipt upload failed:", err);
        });
    }

    return NextResponse.json({
      success: true,
      message: "تم تسجيل طلبك بنجاح! يسعدنا خدمتكم في دار ابن الجراح",
      data: newOrder,
    });
  } catch (error: any) {
    console.error("Order checkout error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء تسجيل الطلب" },
      { status: 500 }
    );
  }
}
