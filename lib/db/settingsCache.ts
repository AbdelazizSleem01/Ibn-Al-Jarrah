import { unstable_cache } from "next/cache";
import dbConnect from "./dbConnect";
import SiteSettings from "@/models/SiteSettings";

export const getCachedSettings = unstable_cache(
  async () => {
    await dbConnect();
    const settings = await SiteSettings.findOne({ key: "main_settings" }).lean();
    return settings ? JSON.parse(JSON.stringify(settings)) : null;
  },
  ["site-settings"],
  {
    revalidate: 300,
    tags: ["settings"],
  }
);
