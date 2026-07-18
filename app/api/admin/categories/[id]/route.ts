import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Category from "@/models/Category";
import Book from "@/models/Book";
import { categorySchema } from "@/lib/validation/schemas";
import { generateSlug } from "@/lib/utils/normalize";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await dbConnect();
    const body = await request.json();
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "بيانات المدخلات غير صحيحة", errors },
        { status: 400 }
      );
    }

    const { name, description, icon, isVisible, displayOrder } = result.data;

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, message: "التصنيف غير موجود" },
        { status: 404 }
      );
    }

    // Check if name is taken by another category
    if (name.toLowerCase() !== category.name.toLowerCase()) {
      const exists = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (exists) {
        return NextResponse.json(
          { success: false, message: "اسم التصنيف مستخدم بالفعل", errors: { name: ["اسم التصنيف مستخدم بالفعل"] } },
          { status: 400 }
        );
      }

      // Re-generate slug
      const slugBase = generateSlug(name);
      let slug = slugBase;
      let counter = 1;
      while (await Category.findOne({ _id: { $ne: id }, slug })) {
        slug = `${slugBase}-${counter}`;
        counter++;
      }
      category.slug = slug;
    }

    category.name = name;
    category.description = description;
    category.icon = icon || "FaBook";
    category.isVisible = isVisible;
    category.displayOrder = displayOrder;

    await category.save();

    return NextResponse.json({
      success: true,
      message: "تم تحديث التصنيف بنجاح",
      data: category,
    });
  } catch (error) {
    console.error("Category PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تحديث التصنيف" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await dbConnect();

    // Check if category exists
    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, message: "التصنيف غير موجود" },
        { status: 404 }
      );
    }

    // Check if any books are linked to this category
    const booksCount = await Book.countDocuments({ categoryId: id, isDeleted: false });
    if (booksCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `لا يمكن حذف التصنيف لأنه مرتبط بـ ${booksCount} من الكتب. يرجى نقل الكتب أو تغيير تصنيفها أولاً.`,
        },
        { status: 400 }
      );
    }

    await Category.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "تم حذف التصنيف بنجاح",
    });
  } catch (error) {
    console.error("Category DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء حذف التصنيف" },
      { status: 500 }
    );
  }
}
