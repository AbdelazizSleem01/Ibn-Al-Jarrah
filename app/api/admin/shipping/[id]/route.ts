import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import ShippingRate from "@/models/ShippingRate";
import { isValidObjectId, readJsonBody, requireAdmin } from "@/lib/security/request";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

// PATCH: Update a governorate shipping rate or active state
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
      return NextResponse.json({ success: false, message: "Invalid shipping rate id" }, { status: 400 });
    }
    const body = await readJsonBody<any>(request);

    const rate = await ShippingRate.findById(id);
    if (!rate) {
      return NextResponse.json(
        { success: false, message: "المحافظة غير موجودة" },
        { status: 404 }
      );
    }

    if (body.baseCost !== undefined) {
      const baseCost = Number(body.baseCost);
      if (!Number.isFinite(baseCost) || baseCost < 0) {
        return NextResponse.json({ success: false, message: "Invalid base cost" }, { status: 400 });
      }
      rate.baseCost = baseCost;
    }
    if (body.extraKgCost !== undefined) {
      const extraKgCost = Number(body.extraKgCost);
      if (!Number.isFinite(extraKgCost) || extraKgCost < 0) {
        return NextResponse.json({ success: false, message: "Invalid extra kg cost" }, { status: 400 });
      }
      rate.extraKgCost = extraKgCost;
    }
    if (body.isActive !== undefined) rate.isActive = Boolean(body.isActive);
    if (body.governorate && typeof body.governorate === "string") rate.governorate = body.governorate.trim().slice(0, 80);

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
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid shipping rate id" }, { status: 400 });
    }

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
