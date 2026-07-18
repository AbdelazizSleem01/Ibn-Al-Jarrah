"use client";

import React from "react";
import { FaBookOpen, FaUser, FaTag, FaInfoCircle } from "react-icons/fa";

interface BookCardProps {
  book: {
    _id: string;
    title: string;
    slug: string;
    author?: string;
    publisher?: string;
    categoryId?: {
      _id: string;
      name: string;
      slug: string;
    };
    prices?: {
      egp?: number;
      lyd?: number;
    };
    coverImage?: {
      secureUrl?: string;
    };
    availabilityStatus: "available" | "unavailable";
    isFeatured?: boolean;
  };
  onDetailsClick: (slug: string) => void;
}

export default function BookCard({ book, onDetailsClick }: BookCardProps) {
  const hasCover = !!book.coverImage?.secureUrl;
  const isAvailable = book.availabilityStatus === "available";

  return (
    <div className="group relative flex flex-col h-full rounded-xl border border-border-color bg-card-bg overflow-hidden hover:scale-[1.01] hover:shadow-lg transition-all duration-300">
      
      {/* Featured Badge */}
      {book.isFeatured && (
        <span className="absolute top-3 right-3 z-10 bg-primary text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md">
          مميز
        </span>
      )}

      {/* Book Cover Image / Mockup Placeholder */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-foreground/5 flex items-center justify-center border-b border-border-color">
        <img
          src={book.coverImage?.secureUrl || "/images/hero-book.webp"}
          alt={book.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Quick View Hover Overlay */}
        <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
          <button
            onClick={() => onDetailsClick(book.slug)}
            className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <FaInfoCircle />
            التفاصيل
          </button>
        </div>
      </div>

      {/* Book Card Details */}
      <div className="p-4 flex flex-col flex-grow gap-2.5">
        
        {/* Title */}
        <h3 className="font-bold text-sm md:text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {book.title}
        </h3>

        {/* Author & Category Info */}
        <div className="flex flex-col gap-1.5 text-xs text-foreground/75">
          {book.author && (
            <div className="flex items-center gap-2">
              <FaUser className="text-primary text-[10px] shrink-0" />
              <span className="line-clamp-1">{book.author}</span>
            </div>
          )}
          {book.categoryId && (
            <div className="flex items-center gap-2">
              <FaTag className="text-primary text-[10px] shrink-0" />
              <span className="line-clamp-1">{book.categoryId.name}</span>
            </div>
          )}
        </div>

        {/* Price & Availability Section */}
        <div className="mt-auto pt-3 border-t border-border-color/50 flex items-center justify-between">
          <div className="flex flex-col text-xs font-black">
            {book.prices?.egp !== undefined && (
              <span className="text-foreground">
                {book.prices.egp} <span className="text-[10px] font-normal text-foreground/60">جنيه مصري</span>
              </span>
            )}
            {book.prices?.lyd !== undefined && (
              <span className="text-foreground mt-0.5">
                {book.prices.lyd} <span className="text-[10px] font-normal text-foreground/60">دينار ليبي</span>
              </span>
            )}
            {book.prices?.egp === undefined && book.prices?.lyd === undefined && (
              <span className="text-foreground/50 text-[10px] font-normal">سعر غير محدد</span>
            )}
          </div>

          {/* Availability Badge */}
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              isAvailable
                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                : "bg-red-500/10 text-red-500 border border-red-500/20"
            }`}
          >
            {isAvailable ? "متوفر" : "نفد"}
          </span>
        </div>

      </div>

    </div>
  );
}
