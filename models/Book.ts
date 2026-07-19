import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBook extends Document {
  title: string;
  normalizedTitle: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  author?: string;
  editorOrTranslator?: string;
  publisher?: string;
  categoryId: mongoose.Types.ObjectId;
  prices: {
    egp?: number;
    lyd?: number;
  };
  coverImage?: {
    secureUrl?: string;
    publicId?: string;
    width?: number;
    height?: number;
  };
  isbn?: string;
  edition?: string;
  publicationYear?: number;
  pagesCount?: number;
  volumesCount: number;
  coverType?: string;
  size?: string;
  language: string;
  tags: string[];
  availabilityStatus: "available" | "unavailable";
  isFeatured: boolean;
  displayOrder: number;
  internalNotes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
}

const BookSchema = new Schema<IBook>(
  {
    title: {
      type: String,
      required: [true, "اسم الكتاب مطلوب"],
      trim: true,
    },
    normalizedTitle: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, "رابط الكتاب (slug) مطلوب"],
      unique: true,
      trim: true,
      index: true,
    },
    shortDescription: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
      index: true,
    },
    editorOrTranslator: {
      type: String,
      trim: true,
    },
    publisher: {
      type: String,
      trim: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "تصنيف الكتاب مطلوب"],
      index: true,
    },
    prices: {
      egp: { type: Number, min: [0, "السعر لا يمكن أن يكون سالباً"] },
      lyd: { type: Number, min: [0, "السعر لا يمكن أن يكون سالباً"] },
    },
    coverImage: {
      secureUrl: { type: String, trim: true },
      publicId: { type: String, trim: true },
      width: { type: Number },
      height: { type: Number },
    },
    isbn: {
      type: String,
      trim: true,
      index: true,
    },
    edition: {
      type: String,
      trim: true,
    },
    publicationYear: {
      type: Number,
    },
    pagesCount: {
      type: Number,
    },
    volumesCount: {
      type: Number,
      default: 1,
    },
    coverType: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      default: "العربية",
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    availabilityStatus: {
      type: String,
      enum: ["available", "unavailable"],
      default: "available",
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    internalNotes: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
BookSchema.index({ createdAt: -1 });
BookSchema.index({ isDeleted: 1, createdAt: -1 });
BookSchema.index({ isDeleted: 1, categoryId: 1, createdAt: -1 });
BookSchema.index({ isDeleted: 1, isFeatured: 1, createdAt: -1 });
BookSchema.index({ isDeleted: 1, availabilityStatus: 1, createdAt: -1 });
BookSchema.index({ title: "text", normalizedTitle: "text", author: "text", publisher: "text", description: "text" });

const Book: Model<IBook> = mongoose.models.Book || mongoose.model<IBook>("Book", BookSchema);

export default Book;
