import { unstable_cache } from "next/cache";
import dbConnect from "./dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";

export const getCachedDefaultBooks = unstable_cache(
  async () => {
    await dbConnect();
    // Referencing Category model ensures schema registration before populate
    void Category;

    const query = { isDeleted: false };
    const sortQuery: any = { displayOrder: 1, createdAt: -1 };

    const [totalResults, booksDocs] = await Promise.all([
      Book.countDocuments(query),
      Book.find(query)
        .populate("categoryId", "name slug icon")
        .sort(sortQuery)
        .limit(12)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalResults / 12);
    return {
      books: booksDocs ? JSON.parse(JSON.stringify(booksDocs)) : [],
      pagination: {
        page: 1,
        limit: 12,
        totalPages,
        totalResults,
      },
    };
  },
  ["default-books-page-1"],
  {
    revalidate: 60,
    tags: ["books"],
  }
);
