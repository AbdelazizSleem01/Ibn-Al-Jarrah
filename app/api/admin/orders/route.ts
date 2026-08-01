import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";
import { boundedInt, escapeRegex } from "@/lib/security/request";
import { requireAdmin } from "@/lib/security/request";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;

await dbConnect();
    const { searchParams } = new URL(request.url);

    const page = boundedInt(searchParams.get("page"), 1, 1, 10000);
    const limit = boundedInt(searchParams.get("limit"), 15, 1, 50);
    const skip = (page - 1) * limit;

    const orderStatus = searchParams.get("orderStatus");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");

    const query: any = {};

    if (orderStatus && orderStatus !== "all") {
      query.orderStatus = orderStatus;
    }

    if (paymentStatus && paymentStatus !== "all") {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      const safeSearch = escapeRegex(search.slice(0, 80));
      query.$or = [
        { orderNumber: { $regex: safeSearch, $options: "i" } },
        { customerName: { $regex: safeSearch, $options: "i" } },
        { customerPhone: { $regex: safeSearch, $options: "i" } },
        { governorate: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit) || 1;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        totalOrders,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error: any) {
    console.error("Admin orders list error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء جلب قائمة الطلبات" },
      { status: 500 }
    );
  }
}
