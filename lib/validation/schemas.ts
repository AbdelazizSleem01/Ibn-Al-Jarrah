import { z } from "zod";

// Helper to validate MongoDB ObjectId
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const mongoIdSchema = z.string().regex(objectIdRegex, {
  message: "معرف غير صالح",
});

// Admin Login validation
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "البريد الإلكتروني مطلوب" })
    .email({ message: "البريد الإلكتروني غير صالح" }),
  password: z
    .string()
    .min(6, { message: "كلمة المرور يجب ألا تقل عن 6 أحرف" }),
  rememberMe: z.boolean().optional(),
});

// Category validation
export const categorySchema = z.object({
  name: z.string().min(2, { message: "اسم التصنيف يجب ألا يقل عن حرفين" }),
  description: z.string().optional(),
  icon: z.string().optional(),
  isVisible: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

// Book validation
export const bookSchema = z.object({
  title: z.string().min(1, { message: "اسم الكتاب مطلوب" }),
  slug: z.string().optional(), // generated automatically if empty
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  editorOrTranslator: z.string().optional(),
  publisher: z.string().optional(),
  categoryId: mongoIdSchema,
  prices: z.object({
    egp: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().min(0, { message: "السعر يجب أن يكون 0 أو أكثر" }).optional()),
    lyd: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().min(0, { message: "السعر يجب أن يكون 0 أو أكثر" }).optional()),
  }).refine(data => data.egp !== undefined || data.lyd !== undefined, {
    message: "يجب إدخال سعر واحد على الأقل (جنيه مصري أو دينار ليبي)",
    path: ["egp"]
  }),
  coverImage: z.object({
    secureUrl: z.string().optional(),
    publicId: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  isbn: z.string().optional(),
  edition: z.string().optional(),
  publicationYear: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().optional()),
  pagesCount: z.preprocess((val) => (val === "" || val === null ? undefined : Number(val)), z.number().int().optional()),
  volumesCount: z.preprocess((val) => (val === "" || val === null ? 1 : Number(val)), z.number().int().min(1).default(1)),
  coverType: z.string().optional(),
  size: z.string().optional(),
  language: z.string().default("العربية"),
  tags: z.array(z.string()).default([]),
  availabilityStatus: z.enum(["available", "unavailable"]).default("available"),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  internalNotes: z.string().optional(),
});

// Site Settings validation
export const settingsSchema = z.object({
  title: z.string().min(1, { message: "اسم المؤسسة مطلوب" }),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  slogan: z.string().optional(),
  message: z.string().optional(),
  phone: z.string().min(1, { message: "رقم الهاتف مطلوب" }),
  whatsapp: z.string().min(1, { message: "رقم الواتساب مطلوب" }),
  facebookUrl: z.string().url({ message: "الرابط غير صالح" }).optional().or(z.literal("")),
  whatsappMenGroup: z.string().url({ message: "الرابط غير صالح" }).optional().or(z.literal("")),
  whatsappWomenGroup: z.string().url({ message: "الرابط غير صالح" }).optional().or(z.literal("")),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.string().optional(),
  }).optional(),
});

// Admin Account Settings validation
export const adminProfileSchema = z.object({
  name: z.string().min(1, { message: "الاسم مطلوب" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صالح" }),
  currentPassword: z.string().min(1, { message: "كلمة المرور الحالية مطلوبة للتأكيد" }),
});

export const adminPasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "كلمة المرور الحالية مطلوبة" }),
  newPassword: z.string().min(6, { message: "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف" }),
  confirmPassword: z.string().min(1, { message: "تأكيد كلمة المرور الجديدة مطلوب" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمة المرور الجديدة وتأكيدها غير متطابقتين",
  path: ["confirmPassword"],
});
