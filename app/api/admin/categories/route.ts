import { NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import dbConnect from "@/lib/db/dbConnect";
import Category from "@/models/Category";
import { categorySchema } from "@/lib/validation/schemas";
import { generateSlug } from "@/lib/utils/normalize";
import { escapeRegex, requireAdmin, readJsonBody } from "@/lib/security/request";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";


export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    await dbConnect();
    // Get all categories, sorted by displayOrder
    const categories = await Category.find()
      .select("name slug description icon isVisible displayOrder booksCount")
      .sort({ displayOrder: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      message: "تم جلب التصنيفات بنجاح",
      data: categories,
    });
  } catch (error) {
    console.error("Admin Categories GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب التصنيفات" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, { csrf: true });
    if (auth.response) return auth.response;
    const rateLimit = await checkRateLimit(request, ratePolicies.adminSensitive);
    if (rateLimit) return rateLimit;

    await dbConnect();
    const body = await readJsonBody(request);
    const result = categorySchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "بيانات المدخلات غير صحيحة", errors },
        { status: 400 }
      );
    }

    const { name, description, icon, isVisible, displayOrder } = result.data;

    // Check if category name exists
    const exists = await Category.findOne({ name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") } });
    if (exists) {
      return NextResponse.json(
        { success: false, message: "اسم التصنيف موجود بالفعل", errors: { name: ["اسم التصنيف موجود بالفعل"] } },
        { status: 400 }
      );
    }

    // Generate unique slug
    const slugBase = generateSlug(name);
    let slug = slugBase;
    let counter = 1;
    while (await Category.findOne({ slug })) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }

    const category = await Category.create({
      name,
      slug,
      description,
      icon: icon || "FaBook",
      isVisible,
      displayOrder,
      booksCount: 0,
    });

    try {
      revalidateTag("categories", "max");
      revalidatePath("/");
      revalidatePath("/categories");
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: "تم إنشاء التصنيف بنجاح",
      data: category,
    });
  } catch (error) {
    console.error("Admin Categories POST Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء إنشاء التصنيف" },
      { status: 500 }
    );
  }
}
