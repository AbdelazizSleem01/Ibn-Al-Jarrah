import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Order from "@/models/Order";
import { getAuthUser } from "@/lib/auth/token";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "غير غير مسرح له" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: "الطلب غير موجود" }, { status: 404 });
    }

    // Mark as read when opened by admin
    if (!order.isReadByAdmin) {
      order.isReadByAdmin = true;
      await order.save();
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء جلب تفاصيل الطلب" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "غير غير مسرح له" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const { orderStatus, paymentStatus, adminNotes, isReadByAdmin } = body;

    const updateData: any = {};
    if (orderStatus !== undefined) updateData.orderStatus = orderStatus;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (isReadByAdmin !== undefined) updateData.isReadByAdmin = isReadByAdmin;

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedOrder) {
      return NextResponse.json({ success: false, message: "الطلب غير موجود" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "تم تحديث حالة الطلب بنجاح",
      data: updatedOrder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء تحديث الطلب" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "غير غير مسرح له" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) {
      return NextResponse.json({ success: false, message: "الطلب غير موجود" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف الطلب بنجاح",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء حذف الطلب" },
      { status: 500 }
    );
  }
}
