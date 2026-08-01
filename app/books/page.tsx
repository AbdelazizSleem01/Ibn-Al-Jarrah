import React from "react";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { getCachedSettings } from "@/lib/db/settingsCache";
import { getCachedCategories } from "@/lib/db/categoryCache";
import { getCachedDefaultBooks } from "@/lib/db/booksCache";
import BooksBrowser from "@/components/public/BooksBrowser";
import { normalizeArabic } from "@/lib/utils/normalize";
import { boundedNumber, escapeRegex, isValidObjectId } from "@/lib/security/request";

import type { Metadata } from "next";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    category?: string;
    author?: string;
    publisher?: string;
    availability?: string;
    isFeatured?: string;
    hasImage?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    currency?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  let title = "مكتبة الكتب الإسلامية والشرعية | دار ابن الجراح";
  let description = "تصفح مكتبة دار ابن الجراح الكبرى واكتشف أحدث المطبوعات والكتب الشرعية والإسلامية بالفقه والعقيدة والتفسير والحديث بأفضل الأسعار.";

  try {
    if (params.category) {
      const categories = await getCachedCategories();
      const cat = categories.find((c: any) => c.slug === params.category || c.name === params.category);
      if (cat) {
        title = `كتب ${cat.name} | دار ابن الجراح للنشر والتوزيع`;
        if (cat.description) description = cat.description;
      }
    } else if (params.search) {
      title = `نتائج البحث عن "${params.search}" | دار ابن الجراح`;
      description = `عرض نتائج البحث عن "${params.search}" في كتب ومطبوعات دار ابن الجراح.`;
    }
  } catch (e) {}

  return {
    title,
    description,
    alternates: {
      canonical: "https://al-jarrah.vercel.app/books",
    },
    openGraph: {
      title,
      description,
      url: "https://al-jarrah.vercel.app/books",
      siteName: "دار ابن الجراح",
      type: "website",
      images: [
        {
          url: "https://al-jarrah.vercel.app/images/logo.webp",
          width: 640,
          height: 640,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://al-jarrah.vercel.app/images/logo.webp"],
    },
  };
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  let categories: any[] = [];
  let books: any[] = [];
  let pagination = {
    page: 1,
    limit: 12,
    totalPages: 1,
    totalResults: 0,
  };

  const isDefaultQuery =
    !params.page &&
    !params.search &&
    !params.category &&
    !params.author &&
    !params.publisher &&
    !params.availability &&
    !params.isFeatured &&
    !params.hasImage &&
    !params.minPrice &&
    !params.maxPrice &&
    !params.sort;

  try {
    // 1. Instant Cached Categories
    categories = await getCachedCategories();

    // 2. Instant Cached Default Books for Page 1 when no filters applied
    if (isDefaultQuery) {
      const defaultData = await getCachedDefaultBooks();
      books = defaultData.books;
      pagination = defaultData.pagination;
    } else {
      // Dynamic Query execution for custom search/filter
      await dbConnect();
      void Category; // Ensure Category schema registered

      const parsedPage = Number.parseInt(params.page || "1", 10);
      const parsedLimit = Number.parseInt(params.limit || "12", 10);
      const page = Number.isFinite(parsedPage) ? Math.min(10000, Math.max(1, parsedPage)) : 1;
      const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, parsedLimit)) : 12;
      const skip = (page - 1) * limit;

      const query: any = { isDeleted: false };

      // Category lookup
      if (params.category) {
        const cat = categories.find((c: any) => c.slug === params.category || c._id === params.category);
        if (cat) {
          query.categoryId = cat._id;
        } else if (isValidObjectId(params.category)) {
          query.categoryId = params.category;
        }
      }

      // Search filter
      if (params.search) {
        const normalizedSearch = escapeRegex(normalizeArabic(params.search.slice(0, 80)));
        query.$or = [
          { normalizedTitle: { $regex: normalizedSearch, $options: "i" } },
          { author: { $regex: normalizedSearch, $options: "i" } },
          { publisher: { $regex: normalizedSearch, $options: "i" } },
          { isbn: { $regex: normalizedSearch, $options: "i" } },
        ];
      }

      // Author filter
      if (params.author) {
        query.author = { $regex: escapeRegex(params.author.slice(0, 80)), $options: "i" };
      }

      // Publisher filter
      if (params.publisher) {
        query.publisher = { $regex: escapeRegex(params.publisher.slice(0, 80)), $options: "i" };
      }

      // Availability status filter
      if (params.availability === "available" || params.availability === "unavailable") {
        query.availabilityStatus = params.availability;
      }

      // Featured books filter
      if (params.isFeatured === "true") {
        query.isFeatured = true;
      }

      // Has image filter
      if (params.hasImage === "true") {
        query["coverImage.secureUrl"] = { $ne: null, $exists: true };
      }

      // Price filters
      const currencyParam = (params.currency || "egp").toLowerCase();
      const currency = ["egp", "lyd", "usd"].includes(currencyParam) ? currencyParam : "egp";
      if (params.minPrice || params.maxPrice) {
        const priceField = currency === "usd" ? "prices.usd" : currency === "lyd" ? "prices.lyd" : "prices.egp";
        query[priceField] = {};
        const minPrice = boundedNumber(params.minPrice || null, 0, 1000000);
        const maxPrice = boundedNumber(params.maxPrice || null, 0, 1000000);
        if (minPrice !== undefined) {
          query[priceField].$gte = minPrice;
        }
        if (maxPrice !== undefined) {
          query[priceField].$lte = maxPrice;
        }
      }

      // Sort queries
      const sortParam = params.sort || "newest";
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

      // Parallel execution of total count & book documents query
      const [totalResults, booksDocs] = await Promise.all([
        Book.countDocuments(query),
        Book.find(query)
          .populate("categoryId", "name slug icon")
          .sort(sortQuery)
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      const totalPages = Math.ceil(totalResults / limit);
      books = booksDocs ? JSON.parse(JSON.stringify(booksDocs)) : [];

      pagination = {
        page,
        limit,
        totalPages,
        totalResults,
      };
    }
  } catch (error) {
    console.error("Books page server component error:", error);
  }

  return (
    <main className="flex-grow bg-background">
      <BooksBrowser
        initialBooks={books}
        categories={categories}
        pagination={pagination}
      />
    </main>
  );
}
