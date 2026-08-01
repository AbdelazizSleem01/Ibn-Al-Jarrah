import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { normalizeArabic, generateSlug } from "@/lib/utils/normalize";
import { escapeRegex, isValidObjectId, readJsonBody } from "@/lib/security/request";
import { requireAdmin } from "@/lib/security/request";

/**
 * Helper function to safely parse numeric values (prices, years, pages, volumes)
 * Returns undefined if non-numeric or NaN to prevent Mongoose CastError.
 */
function parseSafeNumber(val: any): number | undefined {
  if (val === undefined || val === null || val === "" || val === "undefined" || val === "null") {
    return undefined;
  }
  if (typeof val === "number") {
    return isNaN(val) ? undefined : val;
  }
  const str = String(val).replace(/[^\d.]/g, "");
  if (!str) return undefined;
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;
    const rateLimit = await checkRateLimit(request, ratePolicies.fileUpload);
    if (rateLimit) return rateLimit;

await dbConnect();
    const body = await readJsonBody<any>(request, 2 * 1024 * 1024);
    const { books, duplicateStrategy, defaultCategoryId } = body; // duplicateStrategy: 'ignore' | 'update' | 'create_copy'

    if (!books || !Array.isArray(books) || books.length === 0 || books.length > 500) {
      return NextResponse.json(
        { success: false, message: "لا توجد بيانات كتب للاستيراد" },
        { status: 400 }
      );
    }

    const strategy = ["ignore", "update", "create_copy"].includes(duplicateStrategy)
      ? duplicateStrategy
      : "ignore";
    const report = {
      total: books.length,
      imported: 0,
      updated: 0,
      ignored: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Cache categories to speed up lookup and booksCount updates
    const categoryCache = new Map<string, any>();
    const getCategory = async (catIdOrName: string) => {
      if (categoryCache.has(catIdOrName)) {
        return categoryCache.get(catIdOrName);
      }

      let category = null;
      if (isValidObjectId(catIdOrName)) {
        category = await Category.findById(catIdOrName);
      }
      if (!category) {
        // Find by name
        category = await Category.findOne({
          name: { $regex: new RegExp(`^${escapeRegex(catIdOrName.trim().slice(0, 120))}$`, "i") },
        });
      }

      if (category) {
        categoryCache.set(catIdOrName, category);
      }
      return category;
    };

    // Process books in batches
    for (let index = 0; index < books.length; index++) {
      const item = books[index];
      try {
        if (!item.title || !item.title.trim()) {
          report.failed++;
          report.errors.push(`الصف ${index + 1}: اسم الكتاب مطلوب`);
          continue;
        }

        let catIdentifier = item.categoryId || item.categoryName || defaultCategoryId;
        if (!catIdentifier) {
          // Fallback to "عام" category if no category specified
          let generalCat = await Category.findOne({ name: "عام" });
          if (!generalCat) {
            generalCat = await Category.create({
              name: "عام",
              slug: "general",
              description: "التصنيف العام للكتب",
              icon: "FaBook",
              isVisible: true,
              displayOrder: 99,
              booksCount: 0,
            });
          }
          catIdentifier = generalCat._id.toString();
        }

        const category = await getCategory(catIdentifier);
        if (!category) {
          report.failed++;
          report.errors.push(`الصف ${index + 1}: التصنيف غير موجود (${catIdentifier})`);
          continue;
        }

        // Setup values
        const title = item.title.trim();
        const normalizedTitle = normalizeArabic(title);
        const author = item.author ? item.author.trim() : "";
        const publisher = item.publisher ? item.publisher.trim() : "";
        const isbn = item.isbn ? item.isbn.toString().trim() : "";

        // Check for duplicates
        let duplicateBook = null;
        if (isbn) {
          duplicateBook = await Book.findOne({ isbn, isDeleted: false });
        }
        if (!duplicateBook) {
          duplicateBook = await Book.findOne({
            normalizedTitle,
            author,
            isDeleted: false,
          });
        }

        // Parse numerical fields safely
        const egpVal = parseSafeNumber(item.prices?.egp ?? item.priceEgp ?? item["السعر بالجنيه"] ?? item["السعر"]);
        const lydVal = parseSafeNumber(item.prices?.lyd ?? item.priceLyd ?? item["السعر بالدينار"]);
        const usdVal = parseSafeNumber(item.prices?.usd ?? item.priceUsd ?? item["السعر بالدولار"]);
        const wholesaleVal = parseSafeNumber(item.prices?.wholesale ?? item.priceWholesale ?? item["سعر الجملة"]);
        const profitMarginVal = parseSafeNumber(item.prices?.profitMargin ?? item.profitMargin ?? item["هامش الربح"]);
        const pubYear = parseSafeNumber(item.publicationYear ?? item["سنة النشر"]);
        const pages = parseSafeNumber(item.pagesCount ?? item["عدد الصفحات"]);
        const volumes = parseSafeNumber(item.volumesCount ?? item["عدد المجلدات"]) || 1;

        if (duplicateBook) {
          if (strategy === "ignore") {
            report.ignored++;
            continue;
          }

          if (strategy === "update") {
            // Update fields
            duplicateBook.title = title;
            duplicateBook.normalizedTitle = normalizedTitle;
            duplicateBook.author = author;
            duplicateBook.publisher = publisher;
            duplicateBook.editorOrTranslator = item.editorOrTranslator || duplicateBook.editorOrTranslator;
            
            // Handle prices mapping safely
            const prices: any = duplicateBook.prices || {};
            if (egpVal !== undefined) prices.egp = egpVal;
            if (lydVal !== undefined) prices.lyd = lydVal;
            if (usdVal !== undefined) prices.usd = usdVal;
            if (wholesaleVal !== undefined) prices.wholesale = wholesaleVal;
            if (profitMarginVal !== undefined) prices.profitMargin = profitMarginVal;
            duplicateBook.prices = prices;

            duplicateBook.edition = item.edition || duplicateBook.edition;
            duplicateBook.publicationYear = pubYear !== undefined ? pubYear : duplicateBook.publicationYear;
            duplicateBook.pagesCount = pages !== undefined ? pages : duplicateBook.pagesCount;
            duplicateBook.volumesCount = volumes || duplicateBook.volumesCount;
            duplicateBook.coverType = item.coverType || duplicateBook.coverType;
            duplicateBook.size = item.size || duplicateBook.size;
            duplicateBook.language = item.language || duplicateBook.language;
            duplicateBook.availabilityStatus = item.availabilityStatus || duplicateBook.availabilityStatus;
            duplicateBook.isFeatured = item.isFeatured !== undefined ? item.isFeatured : duplicateBook.isFeatured;
            duplicateBook.internalNotes = item.internalNotes || duplicateBook.internalNotes;

            // Handle Category change during update
            if (duplicateBook.categoryId.toString() !== category._id.toString()) {
              const oldCatId = duplicateBook.categoryId;
              duplicateBook.categoryId = category._id as any;
              
              await Category.findByIdAndUpdate(oldCatId, { $inc: { booksCount: -1 } });
              category.booksCount = (category.booksCount || 0) + 1;
              await category.save();
            }

            duplicateBook.updatedBy = user.id as any;
            await duplicateBook.save();
            report.updated++;
            continue;
          }
        }

        // Otherwise create new copy
        const slugBase = generateSlug(title);
        let slug = slugBase;
        let slugCounter = 1;
        while (await Book.findOne({ slug })) {
          slug = `${slugBase}-${slugCounter}`;
          slugCounter++;
        }

        const prices: any = {};
        if (egpVal !== undefined) prices.egp = egpVal;
        if (lydVal !== undefined) prices.lyd = lydVal;
        if (usdVal !== undefined) prices.usd = usdVal;
        if (wholesaleVal !== undefined) prices.wholesale = wholesaleVal;
        if (profitMarginVal !== undefined) prices.profitMargin = profitMarginVal;

        await Book.create({
          title,
          normalizedTitle,
          slug,
          shortDescription: item.shortDescription,
          description: item.description,
          author,
          editorOrTranslator: item.editorOrTranslator,
          publisher,
          categoryId: category._id,
          prices,
          isbn,
          edition: item.edition,
          publicationYear: pubYear,
          pagesCount: pages,
          volumesCount: volumes,
          coverType: item.coverType,
          size: item.size,
          language: item.language || "العربية",
          tags: item.tags || [],
          availabilityStatus: item.availabilityStatus || "available",
          isFeatured: item.isFeatured === true,
          displayOrder: item.displayOrder || 0,
          internalNotes: item.internalNotes,
          isDeleted: false,
          createdBy: user.id,
          updatedBy: user.id,
        });

        // Increment category count
        category.booksCount = (category.booksCount || 0) + 1;
        await category.save();
        report.imported++;

      } catch (err: any) {
        report.failed++;
        report.errors.push(`الصف ${index + 1}: ${err.message || "حدث خطأ غير متوقع"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "اكتملت عملية الاستيراد بنجاح",
      data: report,
    });
  } catch (error) {
    console.error("Import API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء استيراد الكتب" },
      { status: 500 }
    );
  }
}
