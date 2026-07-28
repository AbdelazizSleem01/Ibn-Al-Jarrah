import React from "react";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import { getCachedSettings } from "@/lib/db/settingsCache";
import { getCachedCategories } from "@/lib/db/categoryCache";
import Navbar from "@/components/public/Navbar";
import Hero from "@/components/public/Hero";
import BooksSection from "@/components/public/BooksSection";
import HomeCategories from "@/components/public/HomeCategories";
import WhatsappButton from "@/components/public/WhatsappButton";
import Footer from "@/components/public/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import Link from "next/link";
import { FaPhoneAlt, FaFacebook, FaWhatsapp, FaInfoCircle, FaMapMarkerAlt, FaEnvelope } from "react-icons/fa";

import type { Metadata } from "next";

// Enable ISR caching (revalidate every 60 seconds) to serve home page from Vercel Edge CDN in < 20ms
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  let settings: any = null;
  try {
    const settingsDoc = await getCachedSettings();
    if (settingsDoc) settings = JSON.parse(JSON.stringify(settingsDoc));
  } catch (e) {}

  const title = settings?.seo?.title || settings?.title || "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع | ملاذ طالب العلم الشرعي";
  const description = settings?.seo?.description || settings?.description || "مؤسسة متخصصة في نشر وتوزيع الكتب الإسلامية والشرعية، وتيسير العلم الشرعي لطالب العلم بأفضل الأسعار وأعلى جودة.";
  const keywords = settings?.seo?.keywords || "دار ابن الجراح, كتب شرعية, نشر وتوزيع, طالب العلم, فقه, عقيدة, تفسير, كتب إسلامية";

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: "https://al-jarrah.vercel.app",
    },
    openGraph: {
      title,
      description,
      url: "https://al-jarrah.vercel.app",
      siteName: "دار ابن الجراح",
      type: "website",
      images: [
        {
          url: "https://al-jarrah.vercel.app/images/logo.webp",
          width: 640,
          height: 640,
          alt: "شعار دار ابن الجراح",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://al-jarrah.vercel.app/images/logo.webp"],
    },
  };
}

export default async function Page() {
  let settings: any = null;
  let categories: any[] = [];
  let featuredBooks: any[] = [];
  let latestBooks: any[] = [];

  try {
    await dbConnect();
    // Reference Category model to ensure Mongoose schema registration before populate
    void Category;

    // Fetc h cached categories, settings, and lightweight books list in parallel
    const [settingsDoc, categoriesDocs, featuredDocs, latestDocs] = await Promise.all([
      getCachedSettings(),
      getCachedCategories(),
      Book.find({ isFeatured: true, isDeleted: false })
        .select("-description -internalNotes")
        .populate("categoryId", "name slug icon")
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(8)
        .lean(),
      Book.find({ isDeleted: false })
        .select("-description -internalNotes")
        .populate("categoryId", "name slug icon")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    if (settingsDoc) {
      settings = JSON.parse(JSON.stringify(settingsDoc));
    }
    categories = categoriesDocs || [];
    featuredBooks = featuredDocs ? JSON.parse(JSON.stringify(featuredDocs)) : [];
    latestBooks = latestDocs ? JSON.parse(JSON.stringify(latestDocs)) : [];
  } catch (error) {
    console.error("Home page DB fetch error:", error);
  }

  // Default values fallback if database is empty/not configured
  const phone = settings?.phone || "01272942243";
  const whatsappNum = settings?.whatsapp || "201272942243";
  const facebookUrl = settings?.facebookUrl || "https://www.facebook.com/share/1BgiU7ZwHJ/";
  const whatsappMen = settings?.whatsappMenGroup || "https://chat.whatsapp.com/CMt5FoK9lftEh6rNuVTwFP";
  const whatsappWomen = settings?.whatsappWomenGroup || "https://chat.whatsapp.com/Ji4QlvSxLpiHMtmd6oNEft?mode=gi_c";
  const slogan = settings?.slogan || "دار ابن الجراح: نرفع الجهل بالكتاب";
  const message = settings?.message || "علمٌ ينير الدرب… وأمةٌ تقرأ تنهض";

  return (
    <main className="grow">

      {/* Hero Banner Section (Eager loaded image for LCP optimization) */}
      <Hero settings={settings} />

        {/* About Us (من نحن) Section */}
        <section id="about" className="py-16 bg-foreground/[0.01] border-b border-border-color/30 transition-colors duration-300">
          <div className=" mx-auto px-4 max-w-4xl">
            <ScrollReveal variant="reveal-scale">
              <div className="bg-card-bg border border-border-color rounded-2xl p-6 md:p-10 shadow-md text-right relative overflow-hidden transition-all duration-300 hover:scale-[1.005] hover:shadow-lg hover:border-primary/40">
                {/* Golden glow decoration */}
                <div className="absolute top-0 right-0 w-2 h-full bg-primary" />

                <div className="flex items-center gap-3 mb-6 border-b border-border-color/40 pb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <FaInfoCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-foreground">عن دار ابن الجراح</h2>
                    <p className="text-xs text-primary font-bold">{slogan}</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm md:text-base text-foreground/80 leading-relaxed font-sans">
                  <p className="font-bold text-foreground">
                    مؤسسة دار ابن الجراح العالمية للنشر والتوزيع، مؤسسة شرعية متخصصة في طباعة ونشر وتوزيع الكتب والتراث الإسلامي والشرعي.
                  </p>
                  <p>
                    {message}
                  </p>
                  <p>
                    نلتزم في دار ابن الجراح بتقديم التحقيق العلمي الدقيق، وإخراج الكتب بأعلى معايير الطباعة والورق (الشامواه الفاخر)، مع الحرص التام على تقديم أفضل الأسعار لتشجيع القراءة ونشر العلم الشرعي بين طلبة العلم في كافة أرجاء العالم العربي والإسلامي.
                  </p>
                </div>

                {/* Direct Contact Pills */}
                <div className="mt-8 pt-6 border-t border-border-color/40 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground/70">
                    <FaMapMarkerAlt className="text-primary w-4 h-4" />
                    <span>مصر - طنطا | شحن لجميع المحافظات والدول</span>
                  </div>
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-2 text-xs font-black text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20"
                  >
                    <FaPhoneAlt className="w-3 h-3" />
                    <span dir="ltr">{phone}</span>
                  </a>
                </div>

              </div>
            </ScrollReveal>
          </div>
        </section>

      {/* Featured Books Section */}
      <BooksSection books={featuredBooks} title="الكتب المميزة" showAllLink={true} />

      {/* Categories Showcase */}
      <HomeCategories categories={categories} />

      {/* Latest Arrivals Section */}
      <BooksSection books={latestBooks} title="أحدث الإصدارات" showAllLink={true} />

      {/* Community & WhatsApp Groups Section */}
      <section id="contact" className="py-16 bg-card-bg border-t border-border-color transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 text-center">
          
          <ScrollReveal variant="reveal">
            <span className="text-xs font-extrabold text-primary uppercase tracking-wider mb-2 block">
              مجتمعات طالب العلم
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-4">
              انضم إلى مجموعات الواتساب الخاصة بدار ابن الجراح
            </h2>
            <p className="text-sm md:text-base text-foreground/75 max-w-2xl mx-auto mb-10 leading-relaxed">
              تابع أحدث الإصدارات والخصومات الحصرية والكتب المطبوعة حديثاً فور نزولها عبر مجموعاتنا الرسمية.
            </p>
          </ScrollReveal>

          <ScrollReveal variant="reveal" stagger className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            
            {/* Men's Group Card */}
            <div className="bg-foreground/[0.02] border border-border-color rounded-2xl p-6 flex flex-col items-center justify-between gap-6 hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300 group">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-2xl group-hover:scale-110 transition-transform">
                  <FaWhatsapp />
                </div>
                <h3 className="font-extrabold text-lg text-foreground">مجموعة الرجال (الرجال فقط)</h3>
                <p className="text-xs text-foreground/60 leading-normal">
                  مخصصة للإعلانات وعرض الكتب والطلبات للرجال.
                </p>
              </div>

              <a
                href={whatsappMen}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <FaWhatsapp className="text-base" />
                <span>الانضمام لمجموعة الرجال</span>
              </a>
            </div>

            {/* Women's Group Card */}
            <div className="bg-foreground/[0.02] border border-border-color rounded-2xl p-6 flex flex-col items-center justify-between gap-6 hover:border-emerald-500/40 hover:shadow-lg transition-all duration-300 group">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-2xl group-hover:scale-110 transition-transform">
                  <FaWhatsapp />
                </div>
                <h3 className="font-extrabold text-lg text-foreground">مجموعة النساء (النساء فقط)</h3>
                <p className="text-xs text-foreground/60 leading-normal">
                  مجموعة خاصة ومحفوفة بالخصوصية للنداءات والكتب الخاصة بالنساء.
                </p>
              </div>

              <a
                href={whatsappWomen}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <FaWhatsapp className="text-base" />
                <span>الانضمام لمجموعة النساء</span>
              </a>
            </div>

          </ScrollReveal>

        </div>
      </section>

      {/* Floating WhatsApp Action */}
      <WhatsappButton phone={whatsappNum} />

      {/* Footer */}
      <Footer settings={settings} />

    </main>
  );
}
