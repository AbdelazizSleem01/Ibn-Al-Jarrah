import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { bookSchema } from "@/lib/validation/schemas";
import { generateSlug, normalizeArabic } from "@/lib/utils/normalize";
import { uploadImage } from "@/lib/cloudinary/upload";
import { getAuthUser } from "@/lib/auth/token";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    // Filters
    const query: any = {};

    // Support soft-deleted view toggle
    const showDeleted = searchParams.get("showDeleted") === "true";
    query.isDeleted = showDeleted;

    // Search filter
    const search = searchParams.get("search");
    if (search) {
      const normalizedSearch = normalizeArabic(search);
      query.$or = [
        { normalizedTitle: { $regex: normalizedSearch, $options: "i" } },
        { author: { $regex: normalizedSearch, $options: "i" } },
        { publisher: { $regex: normalizedSearch, $options: "i" } },
        { isbn: { $regex: normalizedSearch, $options: "i" } },
      ];
    }

    // Category filter
    const categoryId = searchParams.get("categoryId");
    if (categoryId) {
      query.categoryId = categoryId;
    }

    // Featured filter
    const isFeatured = searchParams.get("isFeatured");
    if (isFeatured === "true") {
      query.isFeatured = true;
    }

    // Availability filter
    const availability = searchParams.get("availability");
    if (availability) {
      query.availabilityStatus = availability;
    }

    // Execute query
    const totalResults = await Book.countDocuments(query);
    const totalPages = Math.ceil(totalResults / limit);

    const books = await Book.find(query)
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      message: "تم جلب الكتب بنجاح",
      data: books,
      pagination: {
        page,
        limit,
        totalPages,
        totalResults,
      },
    });
  } catch (error) {
    console.error("Admin Books GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب الكتب" },
      { status: 500 }
    );
  }
}

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

    // Validate using Zod
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

    // Generate unique slug
    const slugBase = generateSlug(bookData.title);
    let slug = slugBase;
    let counter = 1;
    while (await Book.findOne({ slug })) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }

    // Normalized title
    const normalizedTitle = normalizeArabic(bookData.title);

    // Image Upload to Cloudinary if base64 provided
    let coverImage = undefined;
    if (body.coverImageBase64) {
      try {
        const uploadRes = await uploadImage(body.coverImageBase64);
        coverImage = uploadRes;
      } catch (err: any) {
        return NextResponse.json(
          { success: false, message: err.message || "فشل رفع غلاف الكتاب" },
          { status: 500 }
        );
      }
    }

    // Create book in DB
    const newBook = await Book.create({
      ...bookData,
      slug,
      normalizedTitle,
      coverImage,
      isDeleted: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    // Increment category booksCount
    category.booksCount = (category.booksCount || 0) + 1;
    await category.save();

    return NextResponse.json({
      success: true,
      message: "تم إضافة الكتاب بنجاح",
      data: newBook,
    });
  } catch (error: any) {
    console.error("Admin Books POST Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إضافة الكتاب" },
      { status: 500 }
    );
  }
}
