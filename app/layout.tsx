import type { Metadata } from "next";
import Script from "next/script";
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
  const keywords = settings?.seo?.keywords || "دار ابن الجراح, نشر وتوزيع, كتب شرعية, طالب العلم, علم شرعي, فقه, عقيدة, تفسير, Ibn Al Jarrah";
  
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://al-jarrah.vercel.app";
  const logoUrl = `${siteUrl}/images/logo.webp`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${settings?.title || "دار ابن الجراح"}`
    },
    applicationName: "دار ابن الجراح",
    description,
    keywords,
    verification: {
      google: "google88383ba5c90a6dc2",
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: "دار ابن الجراح",
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
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
      shortcut: ['/favicon.ico'],
    },
    manifest: '/site.webmanifest',
    other: {
      "apple-mobile-web-app-title": "دار ابن الجراح",
    },
  };
}

import PublicHeader from "@/components/public/PublicHeader";
import PublicFooter from "@/components/public/PublicFooter";
import { getCachedSettings } from "@/lib/db/settingsCache";
import { CurrencyProvider } from "@/context/CurrencyContext";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings = null;
  try {
    const settingsDoc = await getCachedSettings();
    if (settingsDoc) {
      settings = JSON.parse(JSON.stringify(settingsDoc));
    }
  } catch (error) {
    console.error("Layout settings fetch error:", error);
  }

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${tajawal.variable} font-sans h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "xuiiw8dem3");
            `,
          }}
        />
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
        {/* Explicit Favicon Links for Google Search Crawler & Browsers */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-96x96.png" sizes="96x96" type="image/png" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* Schema.org WebSite JSON-LD for Google Search Brand Name */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "دار ابن الجراح",
              "alternateName": ["Ibn Al Jarrah", "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع", "دار ابن الجراح للنشر والتوزيع"],
              "url": "https://al-jarrah.vercel.app",
              "publisher": {
                "@type": "Organization",
                "name": "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://al-jarrah.vercel.app/icon-512.png"
                }
              }
            }),
          }}
        />
      </head>
      <body className="h-dvh h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
        <CurrencyProvider>
          <PublicHeader settings={settings} />
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative">
            {children}
            <PublicFooter settings={settings} />
          </div>
        </CurrencyProvider>
      </body>
    </html>
  );
}
