import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import Order from "@/models/Order";
import { requireAdmin } from "@/lib/security/request";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

await dbConnect();

    // Count unread pending orders
    const pendingCount = await Order.countDocuments({ orderStatus: "pending" });
    const unreadCount = await Order.countDocuments({ isReadByAdmin: false });

    // Fetch latest 5 pending orders for quick dropdown
    const latestPendingOrders = await Order.find({ orderStatus: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("orderNumber customerName grandTotal currency createdAt orderStatus paymentMethod")
      .lean();

    return NextResponse.json({
      success: true,
      pendingCount,
      unreadCount,
      latestPendingOrders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء جلب التنبيهات" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

await dbConnect();

    // Mark all as read
    await Order.updateMany({ isReadByAdmin: false }, { isReadByAdmin: true });

    return NextResponse.json({
      success: true,
      message: "تم تعيين كافة الإشعارات كمقروءة",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ" },
      { status: 500 }
    );
  }
}
