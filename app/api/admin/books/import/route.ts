import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { getAuthUser } from "@/lib/auth/token";
import { normalizeArabic, generateSlug } from "@/lib/utils/normalize";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالدخول" },
        { status: 401 }
      );
    }

    await dbConnect();
    const body = await request.json();
    const { books, duplicateStrategy } = body; // duplicateStrategy: 'ignore' | 'update' | 'create_copy'

    if (!books || !Array.isArray(books) || books.length === 0) {
      return NextResponse.json(
        { success: false, message: "لا توجد بيانات كتب للاستيراد" },
        { status: 400 }
      );
    }

    const strategy = duplicateStrategy || "ignore";
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
      if (catIdOrName.match(/^[0-9a-fA-F]{24}$/)) {
        category = await Category.findById(catIdOrName);
      }
      if (!category) {
        // Find by name
        category = await Category.findOne({ name: { $regex: new RegExp(`^${catIdOrName.trim()}$`, "i") } });
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

        if (!item.categoryName && !item.categoryId) {
          report.failed++;
          report.errors.push(`الصف ${index + 1}: يجب تحديد التصنيف لهذا الكتاب (${item.title})`);
          continue;
        }

        const category = await getCategory(item.categoryId || item.categoryName);
        if (!category) {
          report.failed++;
          report.errors.push(`الصف ${index + 1}: التصنيف غير موجود (${item.categoryId || item.categoryName})`);
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
            const prices = duplicateBook.prices || {};
            if (item.prices?.egp !== undefined) prices.egp = parseFloat(item.prices.egp);
            if (item.prices?.lyd !== undefined) prices.lyd = parseFloat(item.prices.lyd);
            if (item.priceEgp !== undefined) prices.egp = parseFloat(item.priceEgp);
            if (item.priceLyd !== undefined) prices.lyd = parseFloat(item.priceLyd);
            duplicateBook.prices = prices;

            duplicateBook.edition = item.edition || duplicateBook.edition;
            duplicateBook.publicationYear = item.publicationYear || duplicateBook.publicationYear;
            duplicateBook.pagesCount = item.pagesCount || duplicateBook.pagesCount;
            duplicateBook.volumesCount = item.volumesCount || duplicateBook.volumesCount;
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

        const prices = {
          egp: item.prices?.egp !== undefined ? parseFloat(item.prices.egp) : (item.priceEgp !== undefined ? parseFloat(item.priceEgp) : undefined),
          lyd: item.prices?.lyd !== undefined ? parseFloat(item.prices.lyd) : (item.priceLyd !== undefined ? parseFloat(item.priceLyd) : undefined),
        };

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
          publicationYear: item.publicationYear,
          pagesCount: item.pagesCount,
          volumesCount: item.volumesCount || 1,
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
