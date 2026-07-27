import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { getAuthUser } from "@/lib/auth/token";
import { deleteImage } from "@/lib/cloudinary/upload";
import { normalizeArabic } from "@/lib/utils/normalize";

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
    const { ids, action, selectAllMatching, filters, categoryId, availabilityStatus, isFeatured } = body;

    let targetIds: string[] = Array.isArray(ids) ? ids : [];

    // If database-wide select all matching is enabled, query matching documents from DB
    if (selectAllMatching && filters) {
      const query: any = { isDeleted: filters.showDeleted === true };

      if (filters.search && filters.search.trim()) {
        const searchTrim = filters.search.trim();
        const normalized = normalizeArabic(searchTrim);
        const regex = new RegExp(searchTrim, "i");
        const normRegex = new RegExp(normalized, "i");

        query.$or = [
          { title: regex },
          { normalizedTitle: normRegex },
          { author: regex },
          { publisher: regex },
          { isbn: regex },
        ];
      }

      if (filters.categoryId) {
        query.categoryId = filters.categoryId;
      }
      if (filters.availability) {
        query.availabilityStatus = filters.availability;
      }
      if (filters.isFeatured !== undefined && filters.isFeatured !== "") {
        query.isFeatured = filters.isFeatured === "true";
      }

      const matchingBooks = await Book.find(query, { _id: 1 }).lean();
      targetIds = matchingBooks.map((b: any) => b._id.toString());
    }

    if (!targetIds || targetIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "يجب تحديد كتاب واحد على الأقل" },
        { status: 400 }
      );
    }

    const objectIds = targetIds.map((id) => new mongoose.Types.ObjectId(id));

    if (action === "delete") {
      // Fast Aggregation to count books per category before soft-deleting
      const categoryCounts = await Book.aggregate([
        { $match: { _id: { $in: objectIds }, isDeleted: false } },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      ]);

      // Bulk updateMany for soft deletion
      const updateResult = await Book.updateMany(
        { _id: { $in: objectIds }, isDeleted: false },
        { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: user.id } }
      );

      // Decrement category booksCount in bulk
      if (categoryCounts.length > 0) {
        const bulkOps = categoryCounts.map((cat) => ({
          updateOne: {
            filter: { _id: cat._id },
            update: { $inc: { booksCount: -cat.count } },
          },
        }));
        await Category.bulkWrite(bulkOps);
      }

      return NextResponse.json({
        success: true,
        message: `تم نقل ${updateResult.modifiedCount} كتب إلى سلة المحذوفات بنجاح.`,
      });
    }

    if (action === "restore") {
      // Fast Aggregation to count soft-deleted books per category before restoring
      const categoryCounts = await Book.aggregate([
        { $match: { _id: { $in: objectIds }, isDeleted: true } },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      ]);

      // Bulk updateMany for restoring
      const updateResult = await Book.updateMany(
        { _id: { $in: objectIds }, isDeleted: true },
        { $set: { isDeleted: false, updatedBy: user.id }, $unset: { deletedAt: "" } }
      );

      // Increment category booksCount in bulk
      if (categoryCounts.length > 0) {
        const bulkOps = categoryCounts.map((cat) => ({
          updateOne: {
            filter: { _id: cat._id },
            update: { $inc: { booksCount: cat.count } },
          },
        }));
        await Category.bulkWrite(bulkOps);
      }

      return NextResponse.json({
        success: true,
        message: `تم استعادة ${updateResult.modifiedCount} كتب بنجاح.`,
      });
    }

    if (action === "permanentDelete") {
      // Find books to delete and collect images
      const booksToDelete = await Book.find(
        { _id: { $in: objectIds } },
        { _id: 1, isDeleted: 1, categoryId: 1, "coverImage.publicId": 1 }
      ).lean();

      // Collect image publicIds
      const imagePublicIds = booksToDelete
        .map((b: any) => b.coverImage?.publicId)
        .filter(Boolean) as string[];

      // Delete images asynchronously in background
      if (imagePublicIds.length > 0) {
        Promise.allSettled(imagePublicIds.map((pid) => deleteImage(pid))).catch(console.error);
      }

      // Count active books per category to decrement counts
      const activeCatMap = new Map<string, number>();
      for (const b of booksToDelete) {
        if (!b.isDeleted && b.categoryId) {
          const catStr = b.categoryId.toString();
          activeCatMap.set(catStr, (activeCatMap.get(catStr) || 0) + 1);
        }
      }

      // Fast deleteMany call
      const deleteResult = await Book.deleteMany({ _id: { $in: objectIds } });

      // Update category booksCounts in bulk
      if (activeCatMap.size > 0) {
        const bulkOps = Array.from(activeCatMap.entries()).map(([catId, count]) => ({
          updateOne: {
            filter: { _id: catId },
            update: { $inc: { booksCount: -count } },
          },
        }));
        await Category.bulkWrite(bulkOps);
      }

      return NextResponse.json({
        success: true,
        message: `تم حذف ${deleteResult.deletedCount} كتب نهائياً بنجاح.`,
      });
    }

    if (action === "updateCategory") {
      if (!categoryId) {
        return NextResponse.json(
          { success: false, message: "يجب تحديد التصنيف الجديد" },
          { status: 400 }
        );
      }

      const booksToUpdate = await Book.find(
        { _id: { $in: objectIds }, isDeleted: false },
        { _id: 1, categoryId: 1 }
      ).lean();

      const oldCatMap = new Map<string, number>();
      for (const b of booksToUpdate) {
        if (b.categoryId.toString() !== categoryId) {
          const catStr = b.categoryId.toString();
          oldCatMap.set(catStr, (oldCatMap.get(catStr) || 0) + 1);
        }
      }

      const totalMigrated = Array.from(oldCatMap.values()).reduce((a, b) => a + b, 0);

      if (totalMigrated > 0) {
        await Book.updateMany(
          { _id: { $in: objectIds }, isDeleted: false },
          { $set: { categoryId, updatedBy: user.id } }
        );

        const bulkOps = Array.from(oldCatMap.entries()).map(([oldCatId, count]) => ({
          updateOne: {
            filter: { _id: oldCatId },
            update: { $inc: { booksCount: -count } },
          },
        }));

        bulkOps.push({
          updateOne: {
            filter: { _id: categoryId },
            update: { $inc: { booksCount: totalMigrated } },
          },
        });

        await Category.bulkWrite(bulkOps);
      }

      return NextResponse.json({
        success: true,
        message: `تم تحديث تصنيف ${totalMigrated} كتب بنجاح.`,
      });
    }

    if (action === "updateAvailability") {
      if (availabilityStatus !== "available" && availabilityStatus !== "unavailable") {
        return NextResponse.json(
          { success: false, message: "حالة التوفر غير صالحة" },
          { status: 400 }
        );
      }

      const res = await Book.updateMany(
        { _id: { $in: objectIds }, isDeleted: false },
        { $set: { availabilityStatus, updatedBy: user.id } }
      );
      return NextResponse.json({
        success: true,
        message: `تم تحديث حالة التوفر لـ ${res.modifiedCount} كتب بنجاح.`,
      });
    }

    if (action === "updateFeatured") {
      const isFeaturedBool = isFeatured === true;
      const res = await Book.updateMany(
        { _id: { $in: objectIds }, isDeleted: false },
        { $set: { isFeatured: isFeaturedBool, updatedBy: user.id } }
      );
      return NextResponse.json({
        success: true,
        message: `تم تحديث تمييز لـ ${res.modifiedCount} كتب بنجاح.`,
      });
    }

    return NextResponse.json(
      { success: false, message: "الإجراء المطلوب غير صالح" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Bulk API Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تنفيذ العملية الجماعية" },
      { status: 500 }
    );
  }
}
