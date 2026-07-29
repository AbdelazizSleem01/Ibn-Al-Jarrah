import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";
import { getAuthUser } from "@/lib/auth/token";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "غير غير مسرح له" }, { status: 401 });
    }

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

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "غير مسرح له" }, { status: 401 });
    }

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
