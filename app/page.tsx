import React, { Suspense } from "react";
import dbConnect from "@/lib/db/dbConnect";
import Book from "@/models/Book";
import Category from "@/models/Category";
import SiteSettings from "@/models/SiteSettings";
import Navbar from "@/components/public/Navbar";
import Hero from "@/components/public/Hero";
import BooksSection from "@/components/public/BooksSection";
import HomeCategories from "@/components/public/HomeCategories";
import WhatsappButton from "@/components/public/WhatsappButton";
import Footer from "@/components/public/Footer";
import Link from "next/link";
import { FaPhoneAlt, FaFacebook, FaWhatsapp, FaInfoCircle, FaMapMarkerAlt, FaEnvelope } from "react-icons/fa";

// Enable ISR caching (revalidate every 60 seconds) to drastically improve home page load speed on Vercel
export const revalidate = 60;

export default async function Page() {
  let settings: any = null;
  let categories: any[] = [];
  let featuredBooks: any[] = [];
  let latestBooks: any[] = [];

  try {
    await dbConnect();

    // 1. Fetch site settings
    const settingsDoc = await SiteSettings.findOne({ key: "main_settings" });
    if (settingsDoc) {
      settings = JSON.parse(JSON.stringify(settingsDoc));
    }

    // 2. Fetch active categories
    const categoriesDocs = await Category.find({ isVisible: true })
      .sort({ displayOrder: 1 })
      .lean();
    categories = JSON.parse(JSON.stringify(categoriesDocs));

    // 3. Fetch featured books (limit 8)
    const featuredDocs = await Book.find({ isFeatured: true, isDeleted: false })
      .populate("categoryId", "name slug")
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(8)
      .lean();
    featuredBooks = JSON.parse(JSON.stringify(featuredDocs));

    // 4. Fetch latest books (limit 8)
    const latestDocs = await Book.find({ isDeleted: false })
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    latestBooks = JSON.parse(JSON.stringify(latestDocs));
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
    <>
      <Navbar settings={settings} />

      <main className="flex-grow">
        
        {/* Hero Banner Section */}
        <Hero settings={settings} />

        {/* About Us (من نحن) Section */}
        <section id="about" className="py-16 bg-foreground/[0.01] border-b border-border-color/30 transition-colors duration-300">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-card-bg border border-border-color rounded-2xl p-6 md:p-10 shadow-md text-right relative overflow-hidden transition-colors duration-300">
              {/* Golden glow decoration */}
              <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
              
              <h2 className="text-xl md:text-2xl font-black text-foreground mb-6 border-r-4 border-primary pr-3 py-1 flex items-center gap-2">
                <FaInfoCircle className="text-primary w-5 h-5" />
                <span>من نحن</span>
              </h2>
              
              <div className="text-sm md:text-base text-foreground/90 space-y-4 leading-relaxed font-medium">
                <p className="font-extrabold text-primary text-base">بسم الله الرحمن الرحيم</p>
                <p>السلام عليكم ورحمة الله وبركاته، حيّاكم الله في داركم.</p>
                <p>
                  نسعى في <strong>دار ابن الجراح</strong> إلى تيسير العلم الشرعي بأفضل الأسعار وأعلى جودة، 
                  وتقديم مجموعة متنوعة من الكتب التي تخدم طالب العلم والقارئ، 
                  إلى جانب الهدايا والعروض الخاصة لمحبي الكتاب.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Books Section */}
        {featuredBooks.length > 0 && (
          <Suspense fallback={<div className="container mx-auto px-4 py-12 text-center text-xs">جاري تحميل الكتب المميزة...</div>}>
            <BooksSection books={featuredBooks} title="الكتب المميزة" />
          </Suspense>
        )}

        {/* Latest Books Section */}
        <Suspense fallback={<div className="container mx-auto px-4 py-12 text-center text-xs">جاري تحميل أحدث الإصدارات...</div>}>
          <BooksSection books={latestBooks} title="أحدث الإصدارات" showAllLink={true} />
        </Suspense>

        {/* Categories Section */}
        <HomeCategories categories={categories} />

        {/* Slogan & Message Section */}
        <section className="py-16 border-b border-border-color/30 text-center relative overflow-hidden transition-colors duration-300">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-96 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="container mx-auto px-4 flex flex-col items-center justify-center gap-4 max-w-xl">
            <span className="text-sm font-semibold text-primary/70 tracking-widest uppercase">شعارنا ورسالتنا</span>
            <p className="text-lg md:text-2xl font-black text-foreground leading-snug">
              &ldquo;{message}&rdquo;
            </p>
            <div className="h-1 w-16 bg-primary rounded my-2" />
            <p className="text-xs md:text-sm font-bold text-foreground/60 tracking-wider">
              {slogan}
            </p>
          </div>
        </section>

        {/* Contact (اتصل بنا) Section */}
        <section id="contact" className="py-16 transition-colors duration-300">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-xl md:text-2xl font-black text-foreground mb-8 text-center flex items-center justify-center gap-2">
              <FaEnvelope className="text-primary w-5 h-5" />
              <span>تواصل معنا</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              
              {/* Phone & Details */}
              <div className="md:col-span-6 bg-card-bg border border-border-color rounded-2xl p-6 flex flex-col gap-4 justify-between transition-colors duration-300">
                <div className="flex flex-col gap-2">
                  <h3 className="font-extrabold text-sm md:text-base text-foreground">معلومات الاتصال المباشر</h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    يسعدنا استقبال استفساراتكم وطلباتكم طوال اليوم عبر الهاتف أو من خلال صفحاتنا ومجموعاتنا.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-border-color/50">
                  <a href={`tel:${phone}`} className="flex items-center gap-3 text-xs md:text-sm text-foreground hover:text-primary transition-all w-fit">
                    <span className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <FaPhoneAlt className="text-primary text-xs" />
                    </span>
                    <span className="font-bold" dir="ltr">{phone}</span>
                  </a>
                  <div className="flex items-center gap-3 text-xs md:text-sm text-foreground/75">
                    <span className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <FaMapMarkerAlt className="text-primary text-xs" />
                    </span>
                    <span>جمهورية مصر العربية</span>
                  </div>
                </div>
              </div>

              {/* Social & Group Links */}
              <div className="md:col-span-6 bg-card-bg border border-border-color rounded-2xl p-6 flex flex-col gap-4 justify-between transition-colors duration-300">
                <div className="flex flex-col gap-2">
                  <h3 className="font-extrabold text-sm md:text-base text-foreground">شبكات التواصل ومجموعاتنا</h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    انضم لمجموعاتنا التفاعلية على واتساب لمتابعة أحدث الكتب والخصومات الحصرية لطالبي العلم الشرعي.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-border-color/50">
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-xs md:text-sm transition-all"
                  >
                    <FaFacebook />
                    تابعنا على فيسبوك
                  </a>

                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={whatsappMen}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all"
                    >
                      <FaWhatsapp />
                      مجموعة الرجال
                    </a>
                    <a
                      href={whatsappWomen}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-xs transition-all"
                    >
                      <FaWhatsapp />
                      مجموعة النساء
                    </a>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

      </main>

      <WhatsappButton phone={whatsappNum} message="السلام عليكم، أريد الاستفسار عن أحد الكتب." />
      
      <Footer settings={settings} />
    </>
  );
}
