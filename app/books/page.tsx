import React from "react";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import SiteSettings from "@/models/SiteSettings";
import { getCachedSettings } from "@/lib/db/settingsCache";
import Navbar from "@/components/public/Navbar";
import BooksBrowser from "@/components/public/BooksBrowser";
import WhatsappButton from "@/components/public/WhatsappButton";
import Footer from "@/components/public/Footer";
import { normalizeArabic } from "@/lib/utils/normalize";

import type { Metadata } from "next";

export const revalidate = 0;

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
      await dbConnect();
      const cat = await Category.findOne({
        $or: [{ slug: params.category }, { name: params.category }],
      }).lean();
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

  let settings: any = null;
  let categories: any[] = [];
  let books: any[] = [];
  let pagination = {
    page: 1,
    limit: 12,
    totalPages: 1,
    totalResults: 0,
  };

  try {
    await dbConnect();

    // 1. Parallelize first stage (Metadata / settings / category lookup) with cached settings
    const [settingsDoc, categoriesDocs, catDoc] = await Promise.all([
      getCachedSettings(),
      Category.find({ isVisible: true }).sort({ displayOrder: 1 }).lean(),
      params.category && !params.category.match(/^[0-9a-fA-F]{24}$/)
        ? Category.findOne({ slug: params.category }).lean()
        : null,
    ]);

    if (settingsDoc) {
      settings = JSON.parse(JSON.stringify(settingsDoc));
    }
    categories = JSON.parse(JSON.stringify(categoriesDocs));

    // 3. Setup book query variables
    const page = Math.max(1, parseInt(params.page || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(params.limit || "12")));
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: false };

    // Search filter
    if (params.search) {
      const normalizedSearch = normalizeArabic(params.search);
      query.$or = [
        { normalizedTitle: { $regex: normalizedSearch, $options: "i" } },
        { author: { $regex: normalizedSearch, $options: "i" } },
        { publisher: { $regex: normalizedSearch, $options: "i" } },
        { isbn: { $regex: normalizedSearch, $options: "i" } },
      ];
    }

    // Category filter
    if (params.category) {
      if (catDoc) {
        query.categoryId = catDoc._id;
      } else if (params.category.match(/^[0-9a-fA-F]{24}$/)) {
        query.categoryId = params.category;
      }
    }

    // Author filter
    if (params.author) {
      query.author = { $regex: params.author, $options: "i" };
    }

    // Publisher filter
    if (params.publisher) {
      query.publisher = { $regex: params.publisher, $options: "i" };
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
    const currency = params.currency || "egp";
    if (params.minPrice || params.maxPrice) {
      const priceField = currency === "lyd" ? "prices.lyd" : "prices.egp";
      query[priceField] = {};
      if (params.minPrice) {
        query[priceField].$gte = parseFloat(params.minPrice);
      }
      if (params.maxPrice) {
        query[priceField].$lte = parseFloat(params.maxPrice);
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
        sortQuery = currency === "lyd" ? { "prices.lyd": 1 } : { "prices.egp": 1 };
        break;
      case "price-desc":
        sortQuery = currency === "lyd" ? { "prices.lyd": -1 } : { "prices.egp": -1 };
        break;
      case "newest":
      default:
        sortQuery = { createdAt: -1 };
        break;
    }

    // Execute pagination and find queries in parallel
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
    books = JSON.parse(JSON.stringify(booksDocs));

    pagination = {
      page,
      limit,
      totalPages,
      totalResults,
    };
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
