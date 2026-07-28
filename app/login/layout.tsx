import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تسجيل الدخول | لوحة التحكم",
  description: "صفحة تسجيل دخول المسؤولين والمدراء إلى لوحة تحكم دار ابن الجراح للنشر والتوزيع.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
