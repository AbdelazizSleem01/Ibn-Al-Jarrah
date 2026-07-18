import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { bookSchema } from "@/lib/validation/schemas";
import { generateSlug, normalizeArabic } from "@/lib/utils/normalize";
import { uploadImage, deleteImage } from "@/lib/cloudinary/upload";
import { getAuthUser } from "@/lib/auth/token";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await dbConnect();

    const book = await Book.findById(id).populate("categoryId", "name slug");
    if (!book) {
      return NextResponse.json(
        { success: false, message: "الكتاب المطلوب غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم جلب تفاصيل الكتاب بنجاح",
      data: book,
    });
  } catch (error) {
    console.error("Admin Book GET ID Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب تفاصيل الكتاب" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالدخول" },
        { status: 401 }
      );
    }

    await dbConnect();
    const body = await request.json();

    // Check if book exists
    const book = await Book.findById(id);
    if (!book) {
      return NextResponse.json(
        { success: false, message: "الكتاب غير موجود" },
        { status: 404 }
      );
    }

    // Support restoring soft-deleted book directly
    if (body.restore === true) {
      if (book.isDeleted) {
        book.isDeleted = false;
        book.deletedAt = undefined;
        book.updatedBy = user.id as any;
        await book.save();

        // Increment category count
        await Category.findByIdAndUpdate(book.categoryId, { $inc: { booksCount: 1 } });
        return NextResponse.json({
          success: true,
          message: "تم استعادة الكتاب بنجاح",
          data: book,
        });
      }
      return NextResponse.json(
        { success: false, message: "الكتاب غير محذوف بالفعل" },
        { status: 400 }
      );
    }

    // Validate request schema
    const result = bookSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "بيانات الكتاب غير صالحة", errors },
        { status: 400 }
      );
    }

    const bookData = result.data;

    // Check if category exists
    const category = await Category.findById(bookData.categoryId);
    if (!category) {
      return NextResponse.json(
        { success: false, message: "التصنيف المحدد غير موجود" },
        { status: 400 }
      );
    }

    // Handle Category change in booksCount
    const oldCategoryId = book.categoryId;
    const newCategoryId = bookData.categoryId;
    if (oldCategoryId?.toString() !== newCategoryId?.toString() && !book.isDeleted) {
      // Decrement old category count
      if (oldCategoryId) await Category.findByIdAndUpdate(oldCategoryId, { $inc: { booksCount: -1 } });
      // Increment new category count
      if (newCategoryId) await Category.findByIdAndUpdate(newCategoryId, { $inc: { booksCount: 1 } });
    }

    // Handle Title change (re-slugify and re-normalize)
    if (bookData.title !== book.title) {
      const slugBase = generateSlug(bookData.title);
      let slug = slugBase;
      let counter = 1;
      while (await Book.findOne({ _id: { $ne: id }, slug })) {
        slug = `${slugBase}-${counter}`;
        counter++;
      }
      book.slug = slug;
      book.normalizedTitle = normalizeArabic(bookData.title);
    }

    // Handle Image Upload / replacement
    if (body.coverImageBase64) {
      try {
        const uploadRes = await uploadImage(body.coverImageBase64);
        
        // Delete old image if exists
        if (book.coverImage?.publicId) {
          await deleteImage(book.coverImage.publicId);
        }
        
        book.coverImage = uploadRes;
      } catch (err: any) {
        return NextResponse.json(
          { success: false, message: err.message || "فشل رفع غلاف الكتاب الجديد" },
          { status: 500 }
        );
      }
    } else if (body.removeImage === true) {
      // Admin chose to remove image
      if (book.coverImage?.publicId) {
        await deleteImage(book.coverImage.publicId);
      }
      book.coverImage = undefined;
    }

    // Update fields
    const fieldsToUpdate = [
      "title",
      "shortDescription",
      "description",
      "author",
      "editorOrTranslator",
      "publisher",
      "categoryId",
      "prices",
      "isbn",
      "edition",
      "publicationYear",
      "pagesCount",
      "volumesCount",
      "coverType",
      "size",
      "language",
      "tags",
      "availabilityStatus",
      "isFeatured",
      "displayOrder",
      "internalNotes",
    ];

    for (const field of fieldsToUpdate) {
      if ((bookData as any)[field] !== undefined) {
        (book as any)[field] = (bookData as any)[field];
      }
    }

    book.updatedBy = user.id as any;
    await book.save();

    return NextResponse.json({
      success: true,
      message: "تم تحديث الكتاب بنجاح",
      data: book,
    });
  } catch (error: any) {
    console.error("Book PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحديث الكتاب: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالدخول" },
        { status: 401 }
      );
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    const book = await Book.findById(id);
    if (!book) {
      return NextResponse.json(
        { success: false, message: "الكتاب غير موجود" },
        { status: 404 }
      );
    }

    if (permanent) {
      // Hard delete: remove image and completely delete document
      if (book.coverImage?.publicId) {
        await deleteImage(book.coverImage.publicId);
      }

      const catId = book.categoryId;
      const isWasDeleted = book.isDeleted;

      await Book.findByIdAndDelete(id);

      // Decrement category book count if the book was NOT already soft-deleted
      if (!isWasDeleted) {
        await Category.findByIdAndUpdate(catId, { $inc: { booksCount: -1 } });
      }

      return NextResponse.json({
        success: true,
        message: "تم حذف الكتاب نهائياً بنجاح",
      });
    } else {
      // Soft delete
      if (book.isDeleted) {
        return NextResponse.json(
          { success: false, message: "الكتاب محذوف بالفعل" },
          { status: 400 }
        );
      }

      book.isDeleted = true;
      book.deletedAt = new Date();
      book.updatedBy = user.id as any;
      await book.save();

      // Decrement category booksCount
      await Category.findByIdAndUpdate(book.categoryId, { $inc: { booksCount: -1 } });

      return NextResponse.json({
        success: true,
        message: "تم نقل الكتاب إلى سلة المحذوفات بنجاح",
      });
    }
  } catch (error) {
    console.error("Book DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء حذف الكتاب" },
      { status: 500 }
    );
  }
}
