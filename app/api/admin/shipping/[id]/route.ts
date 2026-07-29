import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import ShippingRate from "@/models/ShippingRate";

// PATCH: Update a governorate shipping rate or active state
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const rate = await ShippingRate.findById(id);
    if (!rate) {
      return NextResponse.json(
        { success: false, message: "المحافظة غير موجودة" },
        { status: 404 }
      );
    }

    if (body.baseCost !== undefined) rate.baseCost = Number(body.baseCost);
    if (body.extraKgCost !== undefined) rate.extraKgCost = Number(body.extraKgCost);
    if (body.isActive !== undefined) rate.isActive = Boolean(body.isActive);
    if (body.governorate) rate.governorate = body.governorate.trim();

    await rate.save();

    return NextResponse.json({
      success: true,
      message: "تم تحديث أسعار المحافظة بنجاح",
      data: rate,
    });
  } catch (error: any) {
    console.error("Admin update shipping rate error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "فشل تحديث بيانات الشحن" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a governorate shipping rate
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const rate = await ShippingRate.findByIdAndDelete(id);
    if (!rate) {
      return NextResponse.json(
        { success: false, message: "المحافظة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف المحافظة بنجاح",
    });
  } catch (error: any) {
    console.error("Admin delete shipping rate error:", error);
    return NextResponse.json(
      { success: false, message: "فشل حذف المحافظة" },
      { status: 500 }
    );
  }
}
