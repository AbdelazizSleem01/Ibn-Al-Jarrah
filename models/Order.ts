import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderItem {
  bookId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  coverImage?: string;
  price: number;
  wholesalePrice?: number;
  quantity: number;
  totalPrice: number;
  currency: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAltPhone?: string;
  governorate: string;
  cityOrArea?: string;
  detailedAddress: string;
  notes?: string;

  items: IOrderItem[];

  subtotal: number;
  shippingCost: number;
  grandTotal: number;
  totalProfit: number;
  currency: string; // EGP, LYD, USD

  paymentMethod: "vodafone_cash" | "instapay" | "cash_on_delivery" | "bank_transfer";
  paymentStatus: "pending" | "paid" | "rejected";
  paymentSenderInfo?: string; // Phone number or account name of sender
  paymentReceiptImage?: string; // Image URL of the transfer receipt
  paymentNotes?: string;

  orderStatus: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  adminNotes?: string;
  isReadByAdmin: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    coverImage: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    wholesalePrice: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "EGP", trim: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      required: [true, "اسم العميل مطلوب"],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, "رقم الهاتف مطلوب"],
      trim: true,
      index: true,
    },
    customerAltPhone: {
      type: String,
      trim: true,
    },
    governorate: {
      type: String,
      required: [true, "المحافظة مطلوبة"],
      trim: true,
    },
    cityOrArea: {
      type: String,
      trim: true,
    },
    detailedAddress: {
      type: String,
      required: [true, "العنوان التفصيلي مطلوب"],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [(val: IOrderItem[]) => val.length > 0, "الطلب يجب أن يحتوي على كتاب واحد على الأقل"],
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "EGP",
      trim: true,
    },

    paymentMethod: {
      type: String,
      enum: ["vodafone_cash", "instapay", "cash_on_delivery", "bank_transfer"],
      required: true,
      default: "vodafone_cash",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "rejected"],
      default: "pending",
      index: true,
    },
    paymentSenderInfo: {
      type: String,
      trim: true,
    },
    paymentReceiptImage: {
      type: String,
      trim: true,
    },
    paymentNotes: {
      type: String,
      trim: true,
    },

    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    isReadByAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });

if (mongoose.models.Order) {
  delete (mongoose.models as any).Order;
}

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
