import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISiteSettings extends Document {
  key: string;
  title: string;
  subtitle?: string;
  description?: string;
  logo?: {
    secureUrl?: string;
    publicId?: string;
  };
  slogan?: string;
  message?: string;
  phone?: string;
  whatsapp?: string;
  facebookUrl?: string;
  whatsappMenGroup?: string;
  whatsappWomenGroup?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>({
  key: {
    type: String,
    default: "main_settings",
    unique: true,
  },
  title: {
    type: String,
    required: [true, "اسم المؤسسة مطلوب"],
    default: "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع",
  },
  subtitle: {
    type: String,
    default: "ملاذ طالب العلم الشرعي",
  },
  description: {
    type: String,
    default: "نسعى في دار ابن الجراح إلى تيسير العلم الشرعي بأفضل الأسعار وأعلى جودة، ونقدم هدايا وعروضًا خاصة لكل محب للكتاب.",
  },
  logo: {
    secureUrl: { type: String },
    publicId: { type: String },
  },
  slogan: {
    type: String,
    default: "دار ابن الجراح: نرفع الجهل بالكتاب",
  },
  message: {
    type: String,
    default: "علمٌ ينير الدرب… وأمةٌ تقرأ تنهض",
  },
  phone: {
    type: String,
    default: "01272942243",
  },
  whatsapp: {
    type: String,
    default: "201272942243",
  },
  facebookUrl: {
    type: String,
    default: "https://www.facebook.com/share/1BgiU7ZwHJ/",
  },
  whatsappMenGroup: {
    type: String,
    default: "https://chat.whatsapp.com/CMt5FoK9lftEh6rNuVTwFP",
  },
  whatsappWomenGroup: {
    type: String,
    default: "https://chat.whatsapp.com/Ji4QlvSxLpiHMtmd6oNEft?mode=gi_c",
  },
  seo: {
    title: {
      type: String,
      default: "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع - ملاذ طالب العلم الشرعي",
    },
    description: {
      type: String,
      default: "مؤسسة متخصصة في نشر وتوزيع الكتب، ونسعى إلى تيسير العلم الشرعي وتوفير الكتب بأفضل الأسعار وأعلى جودة.",
    },
    keywords: {
      type: String,
      default: "دار ابن الجراح, نشر وتوزيع, كتب شرعية, طالب العلم, علم شرعي, فقه, عقيدة, تفسير",
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const SiteSettings: Model<ISiteSettings> =
  mongoose.models.SiteSettings || mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);

export default SiteSettings;
