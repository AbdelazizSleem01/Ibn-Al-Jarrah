import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";
import { getAuthUser } from "@/lib/auth/token";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "غير غير مسرح له" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15")));
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
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { governorate: { $regex: search, $options: "i" } },
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
