import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { getAuthUser } from "@/lib/auth/token";
import { deleteImage } from "@/lib/cloudinary/upload";

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
    const { ids, action, categoryId, availabilityStatus, isFeatured } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "يجب تحديد كتاب واحد على الأقل" },
        { status: 400 }
      );
    }

    let modifiedCount = 0;

    if (action === "delete") {
      // Soft Delete: sets isDeleted=true, decrements categories booksCount
      for (const id of ids) {
        const book = await Book.findOne({ _id: id, isDeleted: false });
        if (book) {
          book.isDeleted = true;
          book.deletedAt = new Date();
          book.updatedBy = user.id as any;
          await book.save();
          await Category.findByIdAndUpdate(book.categoryId, { $inc: { booksCount: -1 } });
          modifiedCount++;
        }
      }
      return NextResponse.json({
        success: true,
        message: `تم نقل ${modifiedCount} كتب إلى سلة المحذوفات بنجاح.`,
      });
    }

    if (action === "restore") {
      // Restore Soft Deleted: sets isDeleted=false, increments categories booksCount
      for (const id of ids) {
        const book = await Book.findOne({ _id: id, isDeleted: true });
        if (book) {
          book.isDeleted = false;
          book.deletedAt = undefined;
          book.updatedBy = user.id as any;
          await book.save();
          await Category.findByIdAndUpdate(book.categoryId, { $inc: { booksCount: 1 } });
          modifiedCount++;
        }
      }
      return NextResponse.json({
        success: true,
        message: `تم استعادة ${modifiedCount} كتب بنجاح.`,
      });
    }

    if (action === "permanentDelete") {
      // Hard Delete: deletes from DB, deletes images from Cloudinary, decrements category booksCount
      for (const id of ids) {
        const book = await Book.findById(id);
        if (book) {
          if (book.coverImage?.publicId) {
            await deleteImage(book.coverImage.publicId);
          }
          const wasDeleted = book.isDeleted;
          const catId = book.categoryId;
          await Book.findByIdAndDelete(id);

          if (!wasDeleted) {
            await Category.findByIdAndUpdate(catId, { $inc: { booksCount: -1 } });
          }
          modifiedCount++;
        }
      }
      return NextResponse.json({
        success: true,
        message: `تم حذف ${modifiedCount} كتب نهائياً بنجاح.`,
      });
    }

    if (action === "updateCategory") {
      if (!categoryId) {
        return NextResponse.json(
          { success: false, message: "يجب تحديد التصنيف الجديد" },
          { status: 400 }
        );
      }
      const newCategory = await Category.findById(categoryId);
      if (!newCategory) {
        return NextResponse.json(
          { success: false, message: "التصنيف المحدد غير موجود" },
          { status: 400 }
        );
      }

      for (const id of ids) {
        const book = await Book.findOne({ _id: id, isDeleted: false });
        if (book && book.categoryId.toString() !== categoryId) {
          const oldCategoryId = book.categoryId;
          book.categoryId = categoryId as any;
          book.updatedBy = user.id as any;
          await book.save();

          await Category.findByIdAndUpdate(oldCategoryId, { $inc: { booksCount: -1 } });
          await Category.findByIdAndUpdate(categoryId, { $inc: { booksCount: 1 } });
          modifiedCount++;
        }
      }
      return NextResponse.json({
        success: true,
        message: `تم تحديث تصنيف ${modifiedCount} كتب بنجاح.`,
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
        { _id: { $in: ids }, isDeleted: false },
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
        { _id: { $in: ids }, isDeleted: false },
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
