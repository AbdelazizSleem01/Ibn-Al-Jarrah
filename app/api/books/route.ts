import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { normalizeArabic } from "@/lib/utils/normalize";
import { boundedInt, boundedNumber, escapeRegex, isValidObjectId } from "@/lib/security/request";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    // Parsing pagination params
    const page = boundedInt(searchParams.get("page"), 1, 1, 10000);
    const limit = boundedInt(searchParams.get("limit"), 10, 1, 50);
    const skip = (page - 1) * limit;

    // Filters
    const query: any = { isDeleted: false };

    // 1. Search filter (using Arabic normalization)
    const search = searchParams.get("search");
    if (search) {
      const normalizedSearch = escapeRegex(normalizeArabic(search.slice(0, 80)));
      query.$or = [
        { normalizedTitle: { $regex: normalizedSearch, $options: "i" } },
        { author: { $regex: normalizedSearch, $options: "i" } },
        { publisher: { $regex: normalizedSearch, $options: "i" } },
        { isbn: { $regex: normalizedSearch, $options: "i" } },
        { tags: { $regex: normalizedSearch, $options: "i" } },
      ];
    }

    // 2. Category filter
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      // Find category by slug or ID
      const categoryValue = categoryParam.slice(0, 120);
      const cat = await Category.findOne({
        $or: [{ slug: categoryValue }, { name: categoryValue }],
      });
      if (cat) {
        query.categoryId = cat._id;
      } else if (isValidObjectId(categoryParam)) {
        query.categoryId = categoryParam;
      }
    }

    // 3. Author filter
    const author = searchParams.get("author");
    if (author) {
      query.author = { $regex: escapeRegex(author.slice(0, 80)), $options: "i" };
    }

    // 4. Publisher filter
    const publisher = searchParams.get("publisher");
    if (publisher) {
      query.publisher = { $regex: escapeRegex(publisher.slice(0, 80)), $options: "i" };
    }

    // 5. Featured filter
    const isFeatured = searchParams.get("isFeatured");
    if (isFeatured === "true") {
      query.isFeatured = true;
    }

    // 6. Availability filter
    const availability = searchParams.get("availability");
    if (availability === "available" || availability === "unavailable") {
      query.availabilityStatus = availability;
    }

    // 7. Cover Image filter
    const hasImage = searchParams.get("hasImage");
    if (hasImage === "true") {
      query["coverImage.secureUrl"] = { $ne: null, $exists: true };
    } else if (hasImage === "false") {
      query.$or = [
        { "coverImage.secureUrl": { $exists: false } },
        { "coverImage.secureUrl": "" },
        { "coverImage.secureUrl": null },
      ];
    }

    // 8. Price filters (EGP, LYD, or USD)
    const currencyParam = (searchParams.get("currency") || "egp").toLowerCase();
    const currency = ["egp", "lyd", "usd"].includes(currencyParam) ? currencyParam : "egp";
    const minPrice = boundedNumber(searchParams.get("minPrice"), 0, 1000000);
    const maxPrice = boundedNumber(searchParams.get("maxPrice"), 0, 1000000);

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceField = currency === "usd" ? "prices.usd" : currency === "lyd" ? "prices.lyd" : "prices.egp";
      query[priceField] = {};
      if (minPrice !== undefined) {
        query[priceField].$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        query[priceField].$lte = maxPrice;
      }
    }

    // Sorting
    const sortParam = searchParams.get("sort") || "newest";
    let sortQuery: any = { displayOrder: 1, createdAt: -1 };

    switch (sortParam) {
      case "oldest":
        sortQuery = { createdAt: 1 };
        break;
      case "alphabetical-asc":
        sortQuery = { title: 1 };
        break;
      case "alphabetical-desc":
        sortQuery = { title: -1 };
        break;
      case "price-asc":
        sortQuery = currency === "usd" ? { "prices.usd": 1 } : currency === "lyd" ? { "prices.lyd": 1 } : { "prices.egp": 1 };
        break;
      case "price-desc":
        sortQuery = currency === "usd" ? { "prices.usd": -1 } : currency === "lyd" ? { "prices.lyd": -1 } : { "prices.egp": -1 };
        break;
      case "newest":
      default:
        sortQuery = { createdAt: -1 };
        break;
    }

    // Execute queries in parallel
    const [totalResults, books] = await Promise.all([
      Book.countDocuments(query),
      Book.find(query)
        .populate("categoryId", "name slug icon")
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
    const totalPages = Math.ceil(totalResults / limit);

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
    console.error("Public Books GET Error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء جلب الكتب" },
      { status: 500 }
    );
  }
}
