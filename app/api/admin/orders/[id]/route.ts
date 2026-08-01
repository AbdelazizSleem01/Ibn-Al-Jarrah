import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";
import { isValidObjectId, readJsonBody, requireAdmin } from "@/lib/security/request";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

const ORDER_STATUS = new Set(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
const PAYMENT_STATUS = new Set(["pending", "paid", "rejected"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid order id" }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    if (!order.isReadByAdmin) {
      order.isReadByAdmin = true;
      await order.save();
    }

    return NextResponse.json({ success: true, data: order });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid order id" }, { status: 400 });
    }

    const body = await readJsonBody<any>(request);
    const { orderStatus, paymentStatus, adminNotes, isReadByAdmin } = body;

    const updateData: Record<string, unknown> = {};
    if (orderStatus !== undefined && ORDER_STATUS.has(orderStatus)) updateData.orderStatus = orderStatus;
    if (paymentStatus !== undefined && PAYMENT_STATUS.has(paymentStatus)) updateData.paymentStatus = paymentStatus;
    if (typeof adminNotes === "string") updateData.adminNotes = adminNotes.slice(0, 2000);
    if (isReadByAdmin !== undefined) updateData.isReadByAdmin = Boolean(isReadByAdmin);

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updatedOrder) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid order id" }, { status: 400 });
    }

    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to delete order" },
      { status: 500 }
    );
  }
}
