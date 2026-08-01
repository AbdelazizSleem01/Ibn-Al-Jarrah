import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import dbConnect from "@/lib/db/dbConnect";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { bookSchema } from "@/lib/validation/schemas";
import { generateSlug, normalizeArabic } from "@/lib/utils/normalize";
import { uploadImage, deleteImage } from "@/lib/cloudinary/upload";
import { isValidObjectId, readJsonBody, safeCloudinaryImage } from "@/lib/security/request";
import { requireAdmin } from "@/lib/security/request";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid book id" }, { status: 400 });
    }
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
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid book id" }, { status: 400 });
    }
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

await dbConnect();
    const body = await readJsonBody<any>(request, 2 * 1024 * 1024);

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

    // Handle Images Management (Multiple images & primary cover support)
    if (body.images !== undefined && Array.isArray(body.images)) {
      const incomingImages: any[] = body.images;

      // Identify images to delete from Cloudinary
      const currentImages = Array.isArray(book.images) && book.images.length > 0
        ? book.images
        : (book.coverImage?.publicId ? [book.coverImage] : []);

      const incomingPublicIds = new Set(incomingImages.map((img: any) => img.publicId).filter(Boolean));

      // Delete removed images in parallel
      const deletePromises = currentImages
        .filter((img): img is typeof img & { publicId: string } => Boolean(img?.publicId && !incomingPublicIds.has(img.publicId)))
        .map((img) => deleteImage(img.publicId));
      await Promise.all(deletePromises);

      // Process new and existing images in parallel
      const rawFinalImages = await Promise.all(
        incomingImages.map(async (item: any) => {
          if (item.base64) {
            try {
              return await uploadImage(item.base64);
            } catch (err: any) {
              console.error("Error uploading image in PATCH:", err);
              return null;
            }
          }
          if (item.publicId || item.secureUrl) {
            return {
              secureUrl: safeCloudinaryImage(item.secureUrl),
              publicId: item.publicId,
              width: item.width,
              height: item.height,
            };
          }
          return null;
        })
      );

      const finalImages = rawFinalImages.filter((item): item is NonNullable<typeof item> => item !== null);

      book.images = finalImages;
      book.coverImage = finalImages[0] || undefined;
      book.markModified("images");
      book.markModified("coverImage");

    } else if (body.retainedImages !== undefined || body.newImagesBase64 !== undefined) {
      const retainedImages: any[] = Array.isArray(body.retainedImages) ? body.retainedImages : [];
      const newImagesBase64: string[] = Array.isArray(body.newImagesBase64) ? body.newImagesBase64 : [];

      const currentImages = Array.isArray(book.images) && book.images.length > 0
        ? book.images
        : (book.coverImage?.publicId ? [book.coverImage] : []);

      const retainedPublicIds = new Set(retainedImages.map((img: any) => img.publicId).filter(Boolean));

      for (const img of currentImages) {
        if (img?.publicId && !retainedPublicIds.has(img.publicId)) {
          await deleteImage(img.publicId);
        }
      }

      let uploadedNewImages: any[] = [];
      if (newImagesBase64.length > 0) {
        try {
          const uploadPromises = newImagesBase64.map((b64) => uploadImage(b64));
          uploadedNewImages = await Promise.all(uploadPromises);
        } catch (err: any) {
          return NextResponse.json(
            { success: false, message: err.message || "فشل رفع صور الكتاب الجديدة" },
            { status: 500 }
          );
        }
      }

      const safeRetainedImages = retainedImages.map((item) => ({
        secureUrl: safeCloudinaryImage(item.secureUrl),
        publicId: item.publicId,
        width: item.width,
        height: item.height,
      })).filter((item) => item.secureUrl || item.publicId);
      const finalSafeImages = [...safeRetainedImages, ...uploadedNewImages];
      book.images = finalSafeImages;
      book.coverImage = finalSafeImages[0] || undefined;
      book.markModified("images");
      book.markModified("coverImage");

    } else if (body.coverImageBase64) {
      try {
        const uploadRes = await uploadImage(body.coverImageBase64);
        if (book.coverImage?.publicId) {
          await deleteImage(book.coverImage.publicId);
        }
        book.coverImage = uploadRes;
        book.images = [uploadRes];
        book.markModified("images");
        book.markModified("coverImage");
      } catch (err: any) {
        return NextResponse.json(
          { success: false, message: err.message || "فشل رفع غلاف الكتاب الجديد" },
          { status: 500 }
        );
      }
    } else if (body.removeImage === true) {
      if (Array.isArray(book.images)) {
        for (const img of book.images) {
          if (img?.publicId) await deleteImage(img.publicId);
        }
      } else if (book.coverImage?.publicId) {
        await deleteImage(book.coverImage.publicId);
      }
      book.coverImage = undefined;
      book.images = [];
      book.markModified("images");
      book.markModified("coverImage");
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
    // Explicitly assign & mark prices as modified for Mongoose to save nested fields (usd, wholesale, profitMargin)
    if (bookData.prices) {
      book.prices = {
        egp: bookData.prices.egp,
        lyd: bookData.prices.lyd,
        usd: bookData.prices.usd,
        wholesale: bookData.prices.wholesale,
        profitMargin: bookData.prices.profitMargin,
      };
      book.markModified("prices");
    }

    book.updatedBy = user.id as any;
    await book.save();

    try {
      revalidateTag("books", "max");
      revalidatePath("/");
      revalidatePath("/books");
    } catch (e) {}

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
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid book id" }, { status: 400 });
    }
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const user = auth.user;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

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
      // Hard delete: remove all Cloudinary images and completely delete document
      const imagesToDelete = [...(book.images || [])];
      if (book.coverImage?.publicId && !imagesToDelete.some(img => img.publicId === book.coverImage?.publicId)) {
        imagesToDelete.push(book.coverImage as any);
      }
      for (const img of imagesToDelete) {
        if (img?.publicId) {
          await deleteImage(img.publicId);
        }
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

      try {
        revalidateTag("books", "max");
        revalidatePath("/");
        revalidatePath("/books");
      } catch (e) {}

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
