import type { MetadataRoute } from "next";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ibn-aljarrah.com";

  // Base routes
  const routes = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${siteUrl}/books`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
  ];

  try {
    await dbConnect();

    // 1. Fetch active categories and create search routes
    const categories = await Category.find({ isVisible: true })
      .select("slug updatedAt")
      .lean();

    const categoryRoutes = categories.map((cat: any) => ({
      url: `${siteUrl}/books?category=${cat.slug}`,
      lastModified: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    // 2. Fetch all books (non-deleted) to add detail page links to sitemap
    const books = await Book.find({ isDeleted: false })
      .select("slug updatedAt")
      .lean();

    const bookRoutes = books.map((book: any) => ({
      url: `${siteUrl}/books?book=${book.slug}`,
      lastModified: book.updatedAt ? new Date(book.updatedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...routes, ...categoryRoutes, ...bookRoutes];
  } catch (error) {
    console.error("Sitemap dynamic generation failed:", error);
    return routes;
  }
}
