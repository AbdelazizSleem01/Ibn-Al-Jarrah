import { unstable_cache } from "next/cache";
import dbConnect from "./dbConnect";
import Category from "@/models/Category";

export const getCachedCategories = unstable_cache(
  async () => {
    await dbConnect();
    const categories = await Category.find({ isVisible: true })
      .sort({ displayOrder: 1 })
      .lean();
    return categories ? JSON.parse(JSON.stringify(categories)) : [];
  },
  ["site-categories"],
  {
    revalidate: 86400,
    tags: ["categories"],
  }
);
