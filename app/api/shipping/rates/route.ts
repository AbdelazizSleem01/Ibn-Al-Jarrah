import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import ShippingRate, { DEFAULT_GOVERNORATES_SEED } from "@/models/ShippingRate";

export async function GET() {
  try {
    await dbConnect();

    let rates = await ShippingRate.find({ isActive: true }).sort({ displayOrder: 1, governorate: 1 });

    // Auto-seed default governorate shipping rates if collection is empty
    if (!rates || rates.length === 0) {
      await ShippingRate.insertMany(DEFAULT_GOVERNORATES_SEED);
      rates = await ShippingRate.find({ isActive: true }).sort({ displayOrder: 1, governorate: 1 });
    }

    return NextResponse.json({
      success: true,
      data: rates,
    });
  } catch (error: any) {
    console.error("Fetch shipping rates error:", error);
    return NextResponse.json(
      { success: false, message: "فشل استرجاع أسعار الشحن" },
      { status: 500 }
    );
  }
}
