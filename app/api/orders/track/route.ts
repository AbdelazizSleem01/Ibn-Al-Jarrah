import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    let orderNumber = searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, message: "رقم الطلب مطلوب" },
        { status: 400 }
      );
    }

    // Clean order number (remove # if present and trim)
    orderNumber = orderNumber.trim().replace(/^#/, "");

    const order = await Order.findOne({
      orderNumber: { $regex: new RegExp("^" + orderNumber + "$", "i") },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "لم يتم العثور على الطلب. يرجى التحقق من الرقم والمحاولة مرة أخرى." },
        { status: 404 }
      );
    }

    // Return order details
    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        governorate: order.governorate,
        detailedAddress: order.detailedAddress,
        items: order.items,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        grandTotal: order.grandTotal,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error tracking order:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ ما أثناء البحث عن الطلب." },
      { status: 500 }
    );
  }
}
