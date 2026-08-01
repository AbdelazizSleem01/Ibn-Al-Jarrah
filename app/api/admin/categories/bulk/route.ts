import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/dbConnect";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import Category from "@/models/Category";
import Book from "@/models/Book";
import { escapeRegex, readJsonBody, validateAllowedIds } from "@/lib/security/request";
import { requireAdmin } from "@/lib/security/request";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

await dbConnect();
    const body = await readJsonBody<any>(request);
    const { ids, selectAllMatching, search } = body;

    let targetIds: string[] = validateAllowedIds(ids);

    if (selectAllMatching) {
      const query: any = {};
      if (search && typeof search === "string" && search.trim()) {
        const searchTrim = search.trim();
        const regex = new RegExp(escapeRegex(searchTrim.slice(0, 80)), "i");
        query.$or = [{ name: regex }, { description: regex }];
      }
      const matchingCats = await Category.find(query, { _id: 1 }).lean();
      targetIds = matchingCats.map((c: any) => c._id.toString()).slice(0, 500);
    }

    if (!targetIds || targetIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "يجب تحديد تصنيف واحد على الأقل" },
        { status: 400 }
      );
    }

    const objectIds = targetIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "معرفات التصنيفات المحددة غير صالحة" },
        { status: 400 }
      );
    }

    // Check which categories have linked active books
    const categoriesWithBooks = await Book.distinct("categoryId", {
      categoryId: { $in: objectIds },
      isDeleted: false,
    });

    const categoriesWithBooksSet = new Set(
      categoriesWithBooks.map((catId: any) => catId.toString())
    );

    // Eligible for deletion: categories with 0 books linked
    const eligibleIds = objectIds.filter(
      (id) => !categoriesWithBooksSet.has(id.toString())
    );

    const skippedCount = objectIds.length - eligibleIds.length;

    if (eligibleIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `تعذر حذف التصنيفات المحددة لأن جميعها (${skippedCount}) تحتوي على كتب مرتبطة بها. يرجى نقل الكتب أولاً.`,
          skippedCount,
          deletedCount: 0,
        },
        { status: 400 }
      );
    }

    // Delete eligible empty categories
    const deleteResult = await Category.deleteMany({ _id: { $in: eligibleIds } });

    let msg = `تم حذف ${deleteResult.deletedCount} تصنيف بنجاح.`;
    if (skippedCount > 0) {
      msg += ` وتم استثناء ${skippedCount} تصنيف لاحتوائها على كتب مرتبطة.`;
    }

    return NextResponse.json({
      success: true,
      message: msg,
      deletedCount: deleteResult.deletedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Admin Categories Bulk DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تنفيذ الحذف الجماعي للتصنيفات" },
      { status: 500 }
    );
  }
}
