const mongoose = require("mongoose");
const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

const MONGODB_URI = "mongodb://localhost:27017/dar_aljarrah";

// Helper for Arabic normalization
function normalizeArabic(text) {
  if (!text) return "";
  let normalized = text.toString().trim().toLowerCase();
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, ""); // Remove Tashkeel
  normalized = normalized.replace(/[أإآٱ]/g, "ا"); // Normalize Alef
  normalized = normalized.replace(/ة/g, "ه"); // Normalize Teh Marbuta
  normalized = normalized.replace(/ى/g, "ي"); // Normalize Alef Maksura
  normalized = normalized.replace(/\u0640/g, ""); // Remove Tatweel
  normalized = normalized.replace(/\s+/g, " "); // Collapse spaces
  return normalized;
}

// Helper for Slug generation
function generateSlug(text) {
  if (!text) return "";
  let slug = normalizeArabic(text);
  slug = slug.replace(/[^\w\s\u0600-\u06FF-]/g, ""); // Keep Arabic/English characters and numbers
  slug = slug.replace(/\s+/g, "-");
  slug = slug.replace(/-+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "");
  return slug || Date.now().toString();
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  const db = mongoose.connection;

  // 1. Seed Admin User
  const adminEmail = "admin@daraljarrah.com";
  const defaultPass = "adminPassword123";
  
  const Admin = db.model("Admin", new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }), "admins");

  const adminExists = await Admin.findOne({ email: adminEmail });
  let adminId;
  if (!adminExists) {
    console.log("Seeding default admin account...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPass, salt);
    const newAdmin = await Admin.create({
      email: adminEmail,
      password: hashedPassword,
      name: "مدير النظام",
    });
    adminId = newAdmin._id;
    console.log(`Default admin created: ${adminEmail} / ${defaultPass}`);
  } else {
    adminId = adminExists._id;
    console.log(`Admin account already exists: ${adminEmail}`);
  }

  // 2. Seed default SiteSettings
  const SiteSettings = db.model("SiteSettings", new mongoose.Schema({
    key: { type: String, default: "main_settings", unique: true },
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    logo: { secureUrl: String, publicId: String },
    slogan: { type: String },
    message: { type: String },
    phone: { type: String },
    whatsapp: { type: String },
    facebookUrl: { type: String },
    whatsappMenGroup: { type: String },
    whatsappWomenGroup: { type: String },
    seo: { title: String, description: String, keywords: String },
    updatedAt: { type: Date, default: Date.now }
  }), "sitesettings");

  const settingsExists = await SiteSettings.findOne({ key: "main_settings" });
  if (!settingsExists) {
    console.log("Seeding default SiteSettings...");
    await SiteSettings.create({
      key: "main_settings",
      title: "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع",
      subtitle: "ملاذ طالب العلم الشرعي",
      description: "نسعى في دار ابن الجراح إلى تيسير العلم الشرعي بأفضل الأسعار وأعلى جودة، ونقدم هدايا وعروضًا خاصة لكل محب للكتاب.",
      slogan: "دار ابن الجراح: نرفع الجهل بالكتاب",
      message: "علمٌ ينير الدرب… وأمةٌ تقرأ تنهض",
      phone: "01272942243",
      whatsapp: "201272942243",
      facebookUrl: "https://www.facebook.com/share/1BgiU7ZwHJ/",
      whatsappMenGroup: "https://chat.whatsapp.com/CMt5FoK9lftEh6rNuVTwFP",
      whatsappWomenGroup: "https://chat.whatsapp.com/Ji4QlvSxLpiHMtmd6oNEft?mode=gi_c",
      seo: {
        title: "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع - ملاذ طالب العلم الشرعي",
        description: "مؤسسة متخصصة في نشر وتوزيع الكتب، ونسعى إلى تيسير العلم الشرعي وتوفير الكتب بأفضل الأسعار وأعلى جودة.",
        keywords: "دار ابن الجراح, نشر وتوزيع, كتب شرعية, طالب العلم, علم شرعي, فقه, عقيدة, تفسير"
      }
    });
    console.log("Default site settings created successfully.");
  }

  // 3. Define schemas for Categories and Books
  const Category = db.model("Category", new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    icon: { type: String, default: "FaBook" },
    isVisible: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    booksCount: { type: Number, default: 0 }
  }), "categories");

  const Book = db.model("Book", new mongoose.Schema({
    title: { type: String, required: true },
    normalizedTitle: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String },
    description: { type: String },
    author: { type: String },
    publisher: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    prices: { egp: Number, lyd: Number },
    coverImage: { secureUrl: String, publicId: String },
    isbn: { type: String },
    edition: { type: String },
    publicationYear: { type: Number },
    pagesCount: { type: Number },
    volumesCount: { type: Number, default: 1 },
    coverType: { type: String },
    size: { type: String },
    language: { type: String, default: "العربية" },
    availabilityStatus: { type: String, default: "available" },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
  }), "books");

  // Helper to find or create category
  const categoryCache = new Map();
  async function resolveCategory(name) {
    const trimmed = name.toString().trim();
    if (categoryCache.has(trimmed)) {
      return categoryCache.get(trimmed);
    }
    let cat = await Category.findOne({ name: trimmed });
    if (!cat) {
      const slugBase = generateSlug(trimmed);
      let slug = slugBase;
      let counter = 1;
      while (await Category.findOne({ slug })) {
        slug = `${slugBase}-${counter}`;
        counter++;
      }
      cat = await Category.create({
        name: trimmed,
        slug,
        isVisible: true,
        displayOrder: 0,
        booksCount: 0
      });
    }
    categoryCache.set(trimmed, cat);
    return cat;
  }

  // 4. Parse "قائمة اللؤلؤة بسعر الجنيه 20-01-2026.xlsx"
  const loulouaPath = path.join(__dirname, "قائمة اللؤلؤة بسعر الجنيه 20-01-2026.xlsx");
  if (fs.existsSync(loulouaPath)) {
    console.log("Parsing قائمة اللؤلؤة...");
    const workbook = XLSX.readFile(loulouaPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    console.log(`Parsed ${rows.length} rows.`);

    let imported = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const title = r["الكتاب"]?.toString().trim();
      const catName = r["القسم"]?.toString().trim();

      if (!title || !catName) continue;

      // Duplicate Check (by title + author)
      const author = r["الؤلف"]?.toString().trim() || "";
      const normalizedTitle = normalizeArabic(title);
      const exists = await Book.findOne({ normalizedTitle, author, isDeleted: false });
      
      if (exists) continue;

      const category = await resolveCategory(catName);

      // Unique slug
      const slugBase = generateSlug(title);
      let slug = slugBase;
      let counter = 1;
      while (await Book.findOne({ slug })) {
        slug = `${slugBase}-${counter}`;
        counter++;
      }

      const price = parseFloat(r["سعر  بالجنيه قبل"]) || undefined;

      await Book.create({
        title,
        normalizedTitle,
        slug,
        author,
        publisher: r["ناشر"]?.toString().trim() || "",
        categoryId: category._id,
        prices: { egp: price },
        coverType: r["التجليد"]?.toString().trim() || "",
        isFeatured: r["تصنيف قائمة"]?.toString().trim() === "الاكثر مبيعا",
        isDeleted: false,
        createdBy: adminId,
        updatedBy: adminId
      });

      category.booksCount += 1;
      await category.save();
      imported++;
    }
    console.log(`Successfully imported ${imported} books from قائمة اللؤلؤة.`);
  } else {
    console.log("قائمة اللؤلؤة file not found, skipping.");
  }

  // 5. Parse "باقي الادبيات.xlsx"
  const adabyatPath = path.join(__dirname, "باقي الادبيات.xlsx");
  if (fs.existsSync(adabyatPath)) {
    console.log("Parsing باقي الادبيات...");
    const workbook = XLSX.readFile(adabyatPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // Header row is Row index 8 (9th row in Excel)
    const rows = XLSX.utils.sheet_to_json(sheet, { range: 8, defval: "" });
    console.log(`Parsed ${rows.length} rows.`);

    let imported = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const title = r["عنوان الكتاب"]?.toString().trim();
      const catName = r["موضوع"]?.toString().trim();

      if (!title || !catName) continue;

      const author = r["المؤلف"]?.toString().trim() || "";
      const normalizedTitle = normalizeArabic(title);
      const exists = await Book.findOne({ normalizedTitle, author, isDeleted: false });

      if (exists) continue;

      const category = await resolveCategory(catName);

      const slugBase = generateSlug(title);
      let slug = slugBase;
      let counter = 1;
      while (await Book.findOne({ slug })) {
        slug = `${slugBase}-${counter}`;
        counter++;
      }

      // Check Column 7 (بعد الخصم) or fallback to Column 9 (قبل الخصم)
      const priceVal = r["بعد الخصم"] || r["قبل الخصم"];
      const price = parseFloat(priceVal) || undefined;

      await Book.create({
        title,
        normalizedTitle,
        slug,
        author,
        categoryId: category._id,
        prices: { egp: price },
        size: r["المقاس"]?.toString().trim() || "",
        coverType: r["التجليد"]?.toString().trim() || "",
        publicationYear: parseInt(r["الاصدار"]) || undefined,
        isDeleted: false,
        createdBy: adminId,
        updatedBy: adminId
      });

      category.booksCount += 1;
      await category.save();
      imported++;
    }
    console.log(`Successfully imported ${imported} books from باقي الادبيات.`);
  } else {
    console.log("باقي الادبيات file not found, skipping.");
  }

  console.log("Seed process completed successfully. Closing MongoDB connection.");
  await mongoose.disconnect();
}

run().catch(console.error);
