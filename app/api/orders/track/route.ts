import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";
import { escapeRegex } from "@/lib/security/request";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

function safeEqual(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  try {
    const rateLimit = await checkRateLimit(request, ratePolicies.trackOrder);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    let orderNumber = searchParams.get("orderNumber");
    const phoneLast4 = (searchParams.get("phoneLast4") || "").trim();

    if (!orderNumber || !/^\d{4}$/.test(phoneLast4)) {
      return NextResponse.json(
        { success: false, message: "Order number and phone last 4 digits are required" },
        { status: 400 }
      );
    }

    orderNumber = orderNumber.trim().replace(/^#/, "").slice(0, 32);
    if (!/^[A-Za-z0-9-]+$/.test(orderNumber)) {
      return NextResponse.json(
        { success: false, message: "Invalid order number" },
        { status: 400 }
      );
    }

    const order = await Order.findOne({
      orderNumber: { $regex: new RegExp("^" + escapeRegex(orderNumber) + "$", "i") },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found or phone verification failed" },
        { status: 404 }
      );
    }

    const storedLast4 = order.customerPhone.replace(/\D/g, "").slice(-4);
    if (!safeEqual(phoneLast4, storedLast4)) {
      return NextResponse.json(
        { success: false, message: "Order not found or phone verification failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone.replace(/\d(?=\d{2})/g, "*"),
        governorate: order.governorate,
        cityOrArea: order.cityOrArea,
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
  } catch (error) {
    console.error("Error tracking order:", error);
    return NextResponse.json(
      { success: false, message: "Failed to track order" },
      { status: 500 }
    );
  }
}
