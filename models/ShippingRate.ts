import mongoose, { Schema, Document, Model } from "mongoose";

export interface IShippingRate extends Document {
  governorate: string;
  baseCost: number;       // Base shipping cost for the 1st kg
  extraKgCost: number;    // Extra cost for each additional kg/volume
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingRateSchema = new Schema<IShippingRate>(
  {
    governorate: {
      type: String,
      required: [true, "اسم المحافظة مطلوب"],
      unique: true,
      trim: true,
    },
    baseCost: {
      type: Number,
      required: [true, "سعر الكيلو الأول مطلوب"],
      min: [0, "سعر الشحن لا يمكن أن يكون بالسالب"],
      default: 45,
    },
    extraKgCost: {
      type: Number,
      required: [true, "سعر الكيلو الزائد مطلوب"],
      min: [0, "سعر الكيلو الزائد لا يمكن أن يكون بالسالب"],
      default: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Default Egypt Governorates Seed Data
export const DEFAULT_GOVERNORATES_SEED = [
  { governorate: "القاهرة", baseCost: 45, extraKgCost: 10, displayOrder: 1 },
  { governorate: "الجيزة", baseCost: 45, extraKgCost: 10, displayOrder: 2 },
  { governorate: "القليوبية", baseCost: 50, extraKgCost: 10, displayOrder: 3 },
  { governorate: "الإسكندرية", baseCost: 55, extraKgCost: 12, displayOrder: 4 },
  { governorate: "البحيرة", baseCost: 60, extraKgCost: 12, displayOrder: 5 },
  { governorate: "الدقهلية", baseCost: 60, extraKgCost: 12, displayOrder: 6 },
  { governorate: "الغربية", baseCost: 60, extraKgCost: 12, displayOrder: 7 },
  { governorate: "المنوفية", baseCost: 60, extraKgCost: 12, displayOrder: 8 },
  { governorate: "الشرقية", baseCost: 60, extraKgCost: 12, displayOrder: 9 },
  { governorate: "كفر الشيخ", baseCost: 60, extraKgCost: 12, displayOrder: 10 },
  { governorate: "دمياط", baseCost: 60, extraKgCost: 12, displayOrder: 11 },
  { governorate: "بورسعيد", baseCost: 60, extraKgCost: 12, displayOrder: 12 },
  { governorate: "الإسماعيلية", baseCost: 60, extraKgCost: 12, displayOrder: 13 },
  { governorate: "السويس", baseCost: 60, extraKgCost: 12, displayOrder: 14 },
  { governorate: "الفيوم", baseCost: 65, extraKgCost: 15, displayOrder: 15 },
  { governorate: "بني سويف", baseCost: 65, extraKgCost: 15, displayOrder: 16 },
  { governorate: "المنيا", baseCost: 70, extraKgCost: 15, displayOrder: 17 },
  { governorate: "أسيوط", baseCost: 70, extraKgCost: 15, displayOrder: 18 },
  { governorate: "سوهاج", baseCost: 75, extraKgCost: 15, displayOrder: 19 },
  { governorate: "قنا", baseCost: 75, extraKgCost: 15, displayOrder: 20 },
  { governorate: "الأقصر", baseCost: 80, extraKgCost: 20, displayOrder: 21 },
  { governorate: "أسوان", baseCost: 80, extraKgCost: 20, displayOrder: 22 },
  { governorate: "البحر الأحمر", baseCost: 90, extraKgCost: 20, displayOrder: 23 },
  { governorate: "مطروح", baseCost: 90, extraKgCost: 20, displayOrder: 24 },
  { governorate: "الوادي الجديد", baseCost: 95, extraKgCost: 25, displayOrder: 25 },
  { governorate: "شمال سيناء", baseCost: 95, extraKgCost: 25, displayOrder: 26 },
  { governorate: "جنوب سيناء", baseCost: 95, extraKgCost: 25, displayOrder: 27 },
  { governorate: "خارج مصر (تواصل معنا)", baseCost: 0, extraKgCost: 0, displayOrder: 28 },
];

const ShippingRate: Model<IShippingRate> =
  mongoose.models.ShippingRate ||
  mongoose.model<IShippingRate>("ShippingRate", ShippingRateSchema);

export default ShippingRate;
