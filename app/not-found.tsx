"use client";

import React from "react";
import Link from "next/link";
import { FaHome, FaExclamationTriangle } from "react-icons/fa";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/3 -z-10 w-80 h-80 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="max-w-md w-full bg-card-bg border border-border-color rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center gap-6 transition-colors duration-300">
        
        {/* Warning Icon */}
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center gold-glow">
          <FaExclamationTriangle className="w-8 h-8" />
        </div>

        {/* 404 error codes */}
        <div className="flex flex-col gap-1.5">
          <span className="text-primary font-black text-6xl tracking-widest">٤٠٤</span>
          <h1 className="text-lg md:text-xl font-black text-foreground">الصفحة المطلوبة غير موجودة</h1>
        </div>

        <p className="text-xs md:text-sm text-foreground/60 leading-relaxed max-w-sm">
          عذراً، يبدو أن الصفحة التي تبحث عنها قد تم نقلها، أو حذفها، أو أن الرابط المستعمل غير صحيح.
        </p>

        {/* Go Back Home Button */}
        <Link
          href="/"
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3 rounded-lg text-sm transition-all shadow-md gold-glow active:scale-95 cursor-pointer"
        >
          <FaHome />
          <span>الرجوع للصفحة الرئيسية</span>
        </Link>

      </div>

      <div className="mt-8 text-[10px] text-foreground/40 font-bold">
        مؤسسة دار ابن الجراح العالمية للنشر والتوزيع
      </div>

    </div>
  );
}
