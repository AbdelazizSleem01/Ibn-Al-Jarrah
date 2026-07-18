import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  weight: ["300", "400", "500", "700", "800", "900"],
  subsets: ["arabic"],
  variable: "--font-tajawal",
});

import dbConnect from "@/lib/db/dbConnect";
import SiteSettings from "@/models/SiteSettings";

export async function generateMetadata(): Promise<Metadata> {
  let settings = null;
  try {
    await dbConnect();
    settings = await SiteSettings.findOne({ key: "main_settings" });
  } catch (error) {
    console.error("Failed to fetch settings for metadata:", error);
  }

  const title = settings?.seo?.title || settings?.title || "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع";
  const description = settings?.seo?.description || settings?.description || "مؤسسة متخصصة في نشر وتوزيع الكتب، ونسعى إلى تيسير العلم الشرعي وتوفير الكتب بأفضل الأسعار وأعلى جودة.";
  const keywords = settings?.seo?.keywords || "دار ابن الجراح, نشر وتوزيع, كتب شرعية, طالب العلم, علم شرعي, فقه, عقيدة, تفسير";
  
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = "/images/logo.webp";

  return {
    title: {
      default: title,
      template: `%s | ${settings?.title || "دار ابن الجراح"}`
    },
    description,
    keywords,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: settings?.title || "دار ابن الجراح",
      locale: "ar_EG",
      type: "website",
      images: [
        {
          url: logoUrl,
          width: 800,
          height: 600,
          alt: "شعار دار ابن الجراح",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [logoUrl],
    },
    icons: {
      icon: [
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
      apple: '/apple-touch-icon.png',
      shortcut: '/favicon.ico',
    },
    manifest: '/site.webmanifest',
  };
}

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

