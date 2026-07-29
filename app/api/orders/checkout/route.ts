import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";
import Book from "@/models/Book";
import { uploadImage } from "@/lib/cloudinary/upload";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

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
      shippingCost = 0,
    } = body;

    // Validation
    if (!customerName || !customerPhone || !governorate || !detailedAddress) {
      return NextResponse.json(
        { success: false, message: "جميع حقول بيانات العميل الأساسية مطلوبة (الاسم، الهاتف، المحافظة، العنوان)" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
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
      const book = await Book.findById(item.bookId);
      if (!book || book.isDeleted) {
        return NextResponse.json(
          { success: false, message: `الكتاب المطلوبة تفاصيله غير موجود أو تم حذفه` },
          { status: 404 }
        );
      }

      const qty = Math.max(1, parseInt(item.quantity || 1));
      const volumes = Math.max(1, Number(book.volumesCount) || 1);
      const itemWeight = qty * volumes;
      totalWeightKg += itemWeight;
      
      // Determine unit price based on currency
      let unitPrice = 0;
      if (currency === "LYD") {
        unitPrice = book.prices?.lyd || 0;
      } else if (currency === "USD") {
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
        currency,
      });
    }

    // Calculate smart shipping cost based on governorate & total weight
    let computedShipping = Math.max(0, Number(shippingCost) || 0);
    if (currency === "EGP" && governorate) {
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
    
    if (paymentReceiptImage && paymentReceiptImage.startsWith("data:image/")) {
      // Store for async upload after order is saved
      pendingBase64Receipt = paymentReceiptImage;
    } else if (paymentReceiptImage) {
      finalReceiptImage = paymentReceiptImage;
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
      currency,
      paymentMethod: paymentMethod || "vodafone_cash",
      paymentStatus: paymentMethod === "cash_on_delivery" ? "pending" : "pending",
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
