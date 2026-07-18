"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaChevronLeft, FaChevronRight, FaTags } from "react-icons/fa";
import IconRenderer from "@/components/ui/IconRenderer";

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

interface HomeCategoriesProps {
  categories: Category[];
}

export default function HomeCategories({ categories }: HomeCategoriesProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Calculate pages
  const totalPages = Math.ceil(categories.length / itemsPerPage);
  
  const getVisiblePages = () => {
    const maxVisible = 6;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = currentPage - Math.floor(maxVisible / 2);
    start = Math.max(start, 1);
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = end - maxVisible + 1;
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Get current batch
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCategories = categories.slice(startIndex, startIndex + itemsPerPage);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  if (categories.length === 0) return null;

  return (
    <section className="py-16 bg-foreground/[0.01] border-b border-border-color/30 transition-colors duration-300">
      <div className="container mx-auto px-4">
        
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl md:text-2xl font-black text-foreground border-r-4 border-primary pr-3 py-1 flex items-center gap-2">
            <FaTags className="text-primary w-5 h-5" />
            <span>تصنيفات الكتب</span>
          </h2>

          {totalPages > 1 && (
            <div className="flex items-center gap-2" dir="ltr">
              <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-border-color bg-card-bg flex items-center justify-center text-foreground hover:border-primary/50 disabled:opacity-30 disabled:hover:border-border-color transition-colors cursor-pointer"
                title="السابق"
              >
                <FaChevronLeft className="w-3 h-3" />
              </button>
              
              <span className="text-xs font-bold text-foreground/80 px-2 min-w-14 text-center">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-border-color bg-card-bg flex items-center justify-center text-foreground hover:border-primary/50 disabled:opacity-30 disabled:hover:border-border-color transition-colors cursor-pointer"
                title="التالي"
              >
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Categories Grid */}
        <div key={currentPage} className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in items-stretch">
          {currentCategories.map((cat) => (
            <Link
              key={cat._id}
              href={`/books?category=${cat.slug}`}
              className="group bg-card-bg border border-border-color rounded-xl p-5 text-right flex flex-col gap-3 shadow-sm hover:scale-[1.02] hover:shadow-md hover:border-primary/40 transition-all duration-300 cursor-pointer h-full justify-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                <IconRenderer name={cat.icon} className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </span>
                {cat.description && (
                  <span className="text-[10px] md:text-xs text-foreground/60 line-clamp-2 mt-0.5">
                    {cat.description}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Bullet page indicators at bottom */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {getVisiblePages().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentPage === pageNum
                    ? "w-6 bg-primary animate-pulse"
                    : "w-2.5 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-500"
                }`}
                title={`صفحة ${pageNum}`}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
