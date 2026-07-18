import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  weight: ["300", "400", "500", "700", "800", "900"],
  subsets: ["arabic"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع",
  description: "مؤسسة متخصصة في نشر وتوزيع الكتب، ونسعى إلى تيسير العلم الشرعي وتوفير الكتب بأفضل الأسعار وأعلى جودة.",
  keywords: "دار ابن الجراح, نشر وتوزيع, كتب شرعية, طالب العلم, علم شرعي, فقه, عقيدة, تفسير",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع",
    description: "نسعى إلى تيسير العلم الشرعي وتوفير الكتب بأفضل الأسعار وأعلى جودة.",
    url: "/",
    siteName: "دار ابن الجراح",
    locale: "ar_EG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} font-sans h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

