import React from "react";
import type { Metadata } from "next";
import OrderTracker from "@/components/public/OrderTracker";
import { getCachedSettings } from "@/lib/db/settingsCache";

export async function generateMetadata(): Promise<Metadata> {
  let settings: any = null;
  try {
    const settingsDoc = await getCachedSettings();
    if (settingsDoc) settings = JSON.parse(JSON.stringify(settingsDoc));
  } catch (e) {}

  const title = "تتبع حالة طلبك | " + (settings?.title || "دار ابن الجراح");
  const description = "تتبع حالة طلبك ومكان شحنتك وموعد وصولها إليك بكل سهولة مع دار ابن الجراح.";

  return {
    title,
    description,
    alternates: {
      canonical: "/track",
    },
  };
}

export default function Page() {
  return (
    <main className="flex-grow bg-background transition-colors duration-150">
      <OrderTracker />
    </main>
  );
}
