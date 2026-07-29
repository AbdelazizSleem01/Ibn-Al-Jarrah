import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import ShippingRate, { DEFAULT_GOVERNORATES_SEED } from "@/models/ShippingRate";

// GET: Fetch all governorate shipping rates (including inactive ones)
export async function GET() {
  try {
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
    await dbConnect();
    const body = await request.json();
    const { governorate, baseCost, extraKgCost, isActive = true } = body;

    if (!governorate || baseCost === undefined || extraKgCost === undefined) {
      return NextResponse.json(
        { success: false, message: "جميع البيانات مطلوبة (اسم المحافظة، سعر الكيلو الأول، سعر الكيلو الزائد)" },
        { status: 400 }
      );
    }

    const existing = await ShippingRate.findOne({ governorate: governorate.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "أسعار هذه المحافظة مسجلة بالفعل" },
        { status: 400 }
      );
    }

    const newRate = await ShippingRate.create({
      governorate: governorate.trim(),
      baseCost: Number(baseCost),
      extraKgCost: Number(extraKgCost),
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
