import React from "react";
import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
  title: "لوحة تحكم المشرف - دار ابن الجراح",
  robots: "noindex, nofollow",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
