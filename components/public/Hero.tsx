"use client";

import React from "react";
import Link from "next/link";

interface HeroProps {
  settings?: {
    title: string;
    subtitle: string;
    description: string;
  };
}

export default function Hero({ settings }: HeroProps) {
  const title = settings?.title || "مؤسسة دار ابن الجراح العالمية للنشر والتوزيع";
  const subtitle = settings?.subtitle || "ملاذ طالب العلم الشرعي";
  const desc = settings?.description || "نسعى في دار ابن الجراح إلى تيسير العلم الشرعي بأفضل الأسعار وأعلى جودة، ونقدم هدايا وعروضًا خاصة لكل محب للكتاب.";

  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-border-color/30 transition-colors duration-300">
      
      {/* Decorative Background Shapes */}
      <div className="absolute top-0 right-1/4 -z-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 -z-10 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        
        {/* Left/Right Text Content (RTL: right side) */}
        <div className="md:col-span-7 flex flex-col gap-6 text-center md:text-right items-center md:items-start order-2 md:order-1">
          
          <div className="flex flex-col gap-2 items-center md:items-start">
            <span className="text-xs md:text-sm font-extrabold text-primary tracking-wider uppercase md:border-r-4 md:border-primary md:pr-3 py-0.5">
              {subtitle}
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight md:leading-snug transition-colors">
              {title}
            </h1>
          </div>

          <p className="text-sm md:text-lg text-foreground/80 leading-relaxed max-w-2xl transition-colors">
            {desc}
          </p>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
            <Link
              href="/books"
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-bold text-sm md:text-base transition-all gold-glow gold-glow-hover active:scale-95 cursor-pointer"
            >
              تصفح الكتب
            </Link>
            <a
              href="#contact"
              className="bg-foreground/5 hover:bg-foreground/10 text-foreground border border-border-color px-6 py-3 rounded-lg font-bold text-sm md:text-base transition-all active:scale-95 cursor-pointer"
            >
              تواصل معنا
            </a>
          </div>

        </div>

        {/* Right/Left Image Content (RTL: left side) */}
        <div className="md:col-span-5 flex justify-center order-1 md:order-2">
          <div className="relative w-full max-w-[340px] md:max-w-none aspect-square rounded-2xl overflow-hidden border border-border-color shadow-2xl bg-card-bg group gold-glow transition-all duration-500 hover:scale-[1.02]">
            
            {/* Soft gold hover shimmer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
            
            <img
              src="/images/hero-book.webp"
              alt="كتاب مفتوح يرمز لنشر العلم الشرعي"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
