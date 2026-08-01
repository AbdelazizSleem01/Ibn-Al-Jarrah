import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import ShippingRate, { DEFAULT_GOVERNORATES_SEED } from "@/models/ShippingRate";
import { readJsonBody, requireAdmin } from "@/lib/security/request";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";

// GET: Fetch all governorate shipping rates (including inactive ones)
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    await dbConnect();

    let rates = await ShippingRate.find({}).sort({ displayOrder: 1, governorate: 1 });

    // Seed defaults if empty
    if (!rates || rates.length === 0) {
      await ShippingRate.insertMany(DEFAULT_GOVERNORATES_SEED);
      rates = await ShippingRate.find({}).sort({ displayOrder: 1, governorate: 1 });
    }

    return NextResponse.json({
      success: true,
      data: rates,
    });
  } catch (error: any) {
    console.error("Admin fetch shipping rates error:", error);
    return NextResponse.json(
      { success: false, message: "تعذر استرجاع أسعار الشحن" },
      { status: 500 }
    );
  }
}

// POST: Add new governorate rate
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const body = await readJsonBody<any>(request);
    const { governorate, baseCost, extraKgCost, isActive = true } = body;

    if (typeof governorate !== "string" || !governorate.trim() || baseCost === undefined || extraKgCost === undefined) {
      return NextResponse.json(
        { success: false, message: "جميع البيانات مطلوبة (اسم المحافظة، سعر الكيلو الأول، سعر الكيلو الزائد)" },
        { status: 400 }
      );
    }

    const base = Number(baseCost);
    const extra = Number(extraKgCost);
    if (!Number.isFinite(base) || !Number.isFinite(extra) || base < 0 || extra < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid shipping cost" },
        { status: 400 }
      );
    }

    const existing = await ShippingRate.findOne({ governorate: governorate.trim().slice(0, 80) });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "أسعار هذه المحافظة مسجلة بالفعل" },
        { status: 400 }
      );
    }

    const newRate = await ShippingRate.create({
      governorate: governorate.trim().slice(0, 80),
      baseCost: base,
      extraKgCost: extra,
      isActive: Boolean(isActive),
    });

    return NextResponse.json({
      success: true,
      message: "تم إضافة المحافظة بنجاح",
      data: newRate,
    });
  } catch (error: any) {
    console.error("Admin create shipping rate error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "حدث خطأ أثناء حفظ أسعار المحافظة" },
      { status: 500 }
    );
  }
}
