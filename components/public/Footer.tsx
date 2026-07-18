"use client";

import React from "react";
import Link from "next/link";
import { FaPhoneAlt, FaFacebook, FaWhatsapp } from "react-icons/fa";

interface FooterProps {
  settings?: {
    title: string;
    description: string;
    phone: string;
    whatsapp: string;
    facebookUrl: string;
    whatsappMenGroup: string;
    whatsappWomenGroup: string;
    slogan: string;
    logo?: {
      secureUrl?: string;
    };
  };
}

export default function Footer({ settings }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const brandName = settings?.title || "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع";
  const desc = settings?.description || "نسعى في دار ابن الجراح إلى تيسير العلم الشرعي بأفضل الأسعار وأعلى جودة، وتقديم مجموعة متنوعة من الكتب التي تخدم طالب العلم والقارئ، إلى جانب الهدايا والعروض الخاصة لمحبي الكتاب.";
  const phone = settings?.phone || "01272942243";
  const whatsapp = settings?.whatsapp || "201272942243";
  const facebookUrl = settings?.facebookUrl || "https://www.facebook.com/share/1BgiU7ZwHJ/";
  const whatsappMen = settings?.whatsappMenGroup || "https://chat.whatsapp.com/CMt5FoK9lftEh6rNuVTwFP";
  const whatsappWomen = settings?.whatsappWomenGroup || "https://chat.whatsapp.com/Ji4QlvSxLpiHMtmd6oNEft?mode=gi_c";
  const slogan = settings?.slogan || "دار ابن الجراح: نرفع الجهل بالكتاب";

  return (
    <footer className="bg-foreground/[0.03] border-t border-border-color pt-12 pb-6 transition-colors duration-300">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Branding & Slogan */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img
              src={settings?.logo?.secureUrl || "/images/logo.webp"}
              alt="شعار"
              className="w-10 h-10 rounded-full object-cover border border-primary/20"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span className="font-bold text-base md:text-lg text-foreground leading-tight">
              {brandName}
            </span>
          </div>
          <p className="text-xs md:text-sm text-foreground/70 leading-relaxed max-w-sm">
            {desc}
          </p>
          <span className="inline-block text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full w-fit">
            ✨ {slogan}
          </span>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-sm md:text-base text-foreground border-r-4 border-primary pr-2">
            روابط سريعة
          </h3>
          <ul className="flex flex-col gap-2.5 text-xs md:text-sm text-foreground/80">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                الصفحة الرئيسية
              </Link>
            </li>
            <li>
              <Link href="/books" className="hover:text-primary transition-colors">
                تصفح الكتب
              </Link>
            </li>
            <li>
              <a href="#about" className="hover:text-primary transition-colors">
                قسم من نحن
              </a>
            </li>
            <li>
              <a href="#contact" className="hover:text-primary transition-colors">
                تواصل معنا
              </a>
            </li>
          </ul>
        </div>

        {/* Contact and Community Groups */}
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-sm md:text-base text-foreground border-r-4 border-primary pr-2">
            معلومات التواصل والمجموعات
          </h3>
          <div className="flex flex-col gap-3 text-xs md:text-sm text-foreground/80">
            <a href={`tel:${phone}`} className="flex items-center gap-2.5 hover:text-primary transition-colors w-fit">
              <span className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <FaPhoneAlt className="text-primary text-[10px]" />
              </span>
              <span dir="ltr">{phone}</span>
            </a>
            
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-primary transition-colors w-fit">
              <span className="w-7 h-7 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center shrink-0">
                <FaFacebook className="text-blue-600 text-xs" />
              </span>
              <span>صفحتنا على فيسبوك</span>
            </a>

            <div className="flex flex-col gap-2 mt-1">
              <span className="text-xs text-foreground/60">مجموعات واتساب التفاعلية:</span>
              <div className="flex flex-wrap gap-2">
                <a
                  href={whatsappMen}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-600/10 hover:bg-green-600/20 text-green-600 border border-green-600/20 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                >
                  <FaWhatsapp />
                  مجموعة الرجال
                </a>
                <a
                  href={whatsappWomen}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-600/10 hover:bg-green-600/20 text-green-600 border border-green-600/20 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                >
                  <FaWhatsapp />
                  مجموعة النساء
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Copyrights Section */}
      <div className="container mx-auto px-4 mt-8 pt-6 border-t border-border-color/50 text-center text-xs text-foreground/60">
        <p>
          جميع الحقوق محفوظة © {currentYear} | مؤسسة دار ابن الجراح العالمية للنشر والتوزيع
        </p>
        <p className="mt-1 text-[10px] text-foreground/45">
          ملاذ طالب العلم الشرعي - نرفع الجهل بالكتاب
        </p>
      </div>
    </footer>
  );
}
