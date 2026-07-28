import type { Metadata } from "next";
import AdminLayout from "@/components/admin/AdminLayout";

export const metadata: Metadata = {
  title: "لوحة تحكم المشرف - دار ابن الجراح",
  description: "لوحة تحكم إدارة المطبوعات والكتب والتصنيفات لمؤسسة دار ابن الجراح للنشر والتوزيع.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
